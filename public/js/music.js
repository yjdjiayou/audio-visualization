/**
 * 获取音频资源
 * @param url
 * @param method
 * @param callback
 * @param audioCtx
 */
function request({url, method, callback, audioCtx}) {
    fetch(url, {
        method: method,
        // 注意请求的类型
        responseType: 'arraybuffer'
    }).then(res => {
        return res.arrayBuffer();
    }).then(data => {
        // 解析音频数据
        audioCtx && audioCtx.decodeAudioData(data, (buffer) => {
            // 执行回调函数
            callback(buffer);
        }, (err) => {
            console.log(err);
        });
    })
}


class AudioVisualization {

    constructor(config = {}) {

        this.audioCtx = null;
        this.gainNode = null;
        this.anayserNode = null;
        this.bufferSource = null;
        this.config = config;

        this.init();
    }

    /**
     * 初始化音频节点资源
     */
    init() {
        // 音频上下文
        this.audioCtx = new AudioContext();
        // 音量控制节点
        this.gainNode = this.audioCtx.createGain();
        // 音频可视化节点
        this.anayserNode = this.audioCtx.createAnalyser();
        // 音频数据
        this.bufferSource = this.audioCtx.createBufferSource();

        const {fftSize = 256} = this.config;
        // 设置实时获取到的音频频域数据数量（声波采样数量）
        this.anayserNode.fftSize = fftSize;
        // 必须将原始音频数据先连接到 AnalyserNode（可视化节点）
        // 如果先连接音量再连接到可视化节点的话，原始数据会被处理，可视化节点获取到的信息就不准确
        this.bufferSource.connect(this.anayserNode);
        // 连接音量
        this.anayserNode.connect(this.gainNode);
        // 连接到音频设备（扬声器）
        this.gainNode.connect(this.audioCtx.destination);
    }


    /**
     * 可视化音频数据
     * @param callback
     */
    visualize(callback) {
        // frequencyBinCount（实时获取到的音频频域数据） 的数量是 fftSize 的一半
        let arr = new Uint8Array(this.anayserNode.frequencyBinCount);
        let self = this;

        // 将分析到的音频数据存入 arr数组中
        function musicVisible() {
            // 将音频频域数据复制到传递给它的 Uint8Array（无符号字节数组）中
            self.anayserNode.getByteFrequencyData(arr);
            callback && callback(arr);
            // 不断地获取音频频域数据
            requestAnimationFrame(musicVisible);
        }

        musicVisible();
    }

    /**
     * 播放音频
     */
    play() {
        this.bufferSource.start(0);
    }

    /**
     * 停止播放
     */
    stop() {
        this.bufferSource.stop(0);
    }

    /**
     * 调节音量大小
     * @param volume
     */
    changeVolume(volume) {
        this.gainNode.gain.value = volume;
    }
}


class Music {

    constructor() {
        this.audioVisualizer = audioVisualizer;
        this.currentBufferSource = null;
        this.clickCount = 0;
        this.init();
    }

    init() {
        this.initDOM();
    }

    /**
     * 初始化 DOM 操作
     */
    initDOM() {
        let lists = document.querySelector('#list').children;
        let volume = document.querySelector('#volume');
        let listsArr = Array.prototype.slice.call(lists);
        let self = this;

        // 列表交互操作
        listsArr.forEach((item, index, arr) => {
            item.onclick = function () {

                arr.forEach((el) => {
                    el.classList.remove('selected')
                });
                this.classList.add('selected');

                // 修复连续点击 bug
                self.currentBufferSource && self.currentBufferSource.stop(0);

                self.requestMusicData(item, index);
            }
        });

        // 监听改变声音大小
        this.audioVisualizer.changeVolume(30 / 100);

        volume.addEventListener('change', function () {
            self.audioVisualizer.changeVolume(this.value / 100);
        })
    }

    // 点击音乐列表请求音乐数据
    requestMusicData(item, index) {

        // 计数器拦截 多次点击
        let n = ++this.clickCount;

        // 请求并且传递音乐名称
        request({
            url: '/music/file?name=' + item.innerText,
            method: 'get',
            audioCtx: audioVisualizer.audioCtx,
            callback: (buffer) => {
                if (n !== this.clickCount) return;
                // 创建音频操作节点
                this.audioVisualizer.bufferSource = this.audioVisualizer.audioCtx.createBufferSource();
                // 获取音频buffer数据
                this.audioVisualizer.bufferSource.buffer = buffer;
                // 连接设备
                this.audioVisualizer.bufferSource.connect(this.audioVisualizer.anayserNode);
                // 播放音频
                this.audioVisualizer.bufferSource.start(0);
                // 获取当前的音频buffer资源
                this.currentBufferSource = this.audioVisualizer.bufferSource;
            }
        });
    }
}


// 点状
class Dot {
    constructor({x, y, r, canvas, ctx, colors}) {

        this.x = x;
        this.y = y;
        this.r = r;
        this.dy = Math.random() * 1.2

        this.canvas = canvas;
        this.ctx = ctx;
        this.colors = colors;
    }

    draw() {

        this.ctx.beginPath();


        this.ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true);
        this.fillRadial();
        //this.ctx.fillStyle = '#fff';
        //this.ctx.fill();
    }

    fillRadial() {

        let radial = this.ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        radial.addColorStop(0, this.colors[0]);
        radial.addColorStop(0.5, this.colors[1]);
        radial.addColorStop(1, this.colors[2]);

        this.ctx.fillStyle = radial;
        this.ctx.fill();
    }

    update(maxRadius) {
        this.y -= this.dy;

        if (this.y < -maxRadius) {
            this.y = this.canvas.height;
        }
    }

}

// 柱状
class Column {

    constructor({w, h, x, y, canvas, ctx, colors}) {
        this.w = w;
        this.h = h;
        this.x = x;
        this.y = y;

        this.canvas = canvas;
        this.ctx = ctx;
        this.colors = colors;
    }

    draw() {
        this.fillRects();
        this.ctx.beginPath();
        this.ctx.fillRect(this.x, this.y, this.w, this.h);
    }

    fillRects() {
        let line = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        line.addColorStop(0, this.colors[0]);
        line.addColorStop(0.5, this.colors[1]);
        line.addColorStop(1, this.colors[2]);
        this.ctx.fillStyle = line;
    }

    update() {

    }
}


// 柱状顶部音频格子
class Cap {
    constructor({w, h, x, y, canvas, ctx, colors}) {
        this.w = w;
        this.h = h;
        this.x = x;
        this.y = y;
        this.cap = 0;
        this.dis = 40;

        this.canvas = canvas;
        this.ctx = ctx;
        this.colors = colors ? colors : 'rgba(255,255,255,1)';
    }

    draw() {
        this.fillRects();
        this.ctx.beginPath();
        this.ctx.fillRect(this.x, this.y, this.w, this.h);
    }

    fillRects() {
        let line = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        line.addColorStop(0, this.colors[0]);
        line.addColorStop(0.5, this.colors[1]);
        line.addColorStop(1, this.colors[2]);
        this.ctx.fillStyle = line;
    }

    update(h) {
        this.cap *= 0.96;
        if (this.cap < 0) {
            this.cap = 0;
        }
        if (h > 0 && this.cap <= h + this.dis) {
            this.cap = h + this.dis > this.canvas.height - this.h ? this.canvas.height - this.h : h + this.dis;
        }
        /*this.caps[i].cap--;
        if(this.caps[i].cap < 0){
            this.caps[i].cap = 0;
        }
        if( h > 0 && this.caps[i].cap < h + 40 ){
            this.caps[i].cap = h + 40 > this.canvasHeight - this.caps[i].h ? this.canvasHeight - this.caps[i].h : h + 40;
        }*/
    }
}

class Canvas {

    constructor() {
        this.box = document.querySelector('#box');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.music = new Music();
        this.audioVisualizer = audioVisualizer;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.size = 80;

        // 默认绘制矩形
        this.type = 'column';
        this.dotsPos = [];
        this.columns = [];
        this.caps = [];
        this.wh = {
            cw: 0,
            ch: 0
        };

        this.init();
    }

    init() {
        this.initCanvas();
    }

    /**
     * 初始化 canvas
     */
    initCanvas() {

        this.box.appendChild(this.canvas);

        let t = setTimeout(() => {
            this.wh = {
                cw: this.canvas.width,
                ch: this.canvas.height
            };
            clearTimeout(t);
        }, 500);

        this.resizeCanvas();

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.initialChart();
        });

        // 初始化图形
        this.initialChart();

        // 图形化音频数据
        this.audioVisualizer.visualize((arr) => {
            this.draw(arr);
        });

        // 点击切换柱状图和点状图
        let btns = document.querySelector('#type').children;
        let self = this;
        Array.prototype.slice.call(btns).forEach(v => {
            v.onclick = function () {
                for (var i = 0; i < btns.length; i++) {
                    btns[i].className = '';
                }
                // this.className = 'selected';
                self.type = this.dataset.type;
            }
        })
    }


    initialChart() {

        this.columns = [];
        this.caps = [];

        // 初始化柱状
        for (let i = 0; i < this.size; i++) {
            let color = ['red', 'yellow', 'green'];
            this.columns.push(new Column({
                x: 0,
                y: 0,
                w: 0,
                h: 0,
                ctx: this.ctx,
                canvas: this.canvas,
                colors: color
            }));

            // 初始化柱状帽
            this.caps.push(new Cap({
                x: 0,
                y: 0,
                w: 0,
                h: 0,
                ctx: this.ctx,
                canvas: this.canvas,
                colors: color
            }));
        }

        //初始化点状图
        this.initDotPos();
    }

    initDotPos() {
        this.dotsPos = [];
        // 初始化dot图形位置
        for (let i = 0; i < this.size; i++) {
            this.dotsPos.push(new Dot({
                x: this.canvasWidth * Math.random(),
                y: this.canvasHeight * Math.random(),
                colors: ['rgba(255,255,255,0.8)', this.getRandomColor(1), 'rgba(255,255,255,0)'],
                ctx: this.ctx,
                canvas: this.canvas
            }))
        }
    }

    /**
     * canvas 响应式
     */
    resizeCanvas() {
        this.canvasWidth = this.box.clientWidth;
        this.canvasHeight = this.box.clientHeight;
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
    }

    /**
     * 绘制图形
     * @param arr
     */
    draw(arr) {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        let w = this.canvasWidth / this.size;
        let columnWidth = w * 0.6;
        let radius = 60;

        for (let i = 0; i < this.size; i++) {
            // 绘制柱状图
            if (this.type === 'column') {

                let h = this.canvasHeight * (arr[i] / 256);
                let ch = columnWidth * 0.5;

                // 柱状图 属性变化
                this.columns[i].x = w * i;
                this.columns[i].y = this.canvasHeight - h;
                this.columns[i].w = columnWidth;
                this.columns[i].h = h;
                this.columns[i].draw();

                // 柱状帽
                this.caps[i].x = w * i;
                this.caps[i].y = this.canvasHeight - (ch + this.caps[i].cap);
                this.caps[i].w = columnWidth;
                this.caps[i].h = ch;
                this.caps[i].update(h);
                this.caps[i].draw();

            }
            // 绘制点状图
            else {
                if ((arr[i] / 256) * radius === 0) return;
                // 计算比例
                let scale = (this.canvasHeight >= this.canvasWidth ? this.wh.cw / this.canvasWidth : this.wh.ch / this.canvasHeight);
                if (scale > 1) scale = 1;
                // 点状
                this.dotsPos[i].r = (arr[i] / 256) * radius * scale;
                this.dotsPos[i].draw();
                this.dotsPos[i].update(radius);
            }
        }
    }

    /**
     * 获取随机颜色
     * @param alphas
     * @returns {string}
     */
    getRandomColor(alphas) {
        let alpha = alphas || 1;
        return `rgba(${255 * Math.random()},${255 * Math.random()},${255 * Math.random()},${alpha})`;
    }

}

const audioVisualizer = new AudioVisualization();
const canvas = new Canvas();
