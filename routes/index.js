const router = require('koa-router')();
const fs = require('fs');
const path = require('path');
const bodyparser = require('koa-bodyparser');

router.use(bodyparser());

const musicPath = path.resolve(path.dirname(__dirname), './public/music/');

async function readFiles() {
    return fs.readdirSync(musicPath);
}

router.get('/', async function (ctx, next) {

    let files = await readFiles();
    await ctx.render('index', {
        title: 'H5 Music Audio',
        music: files
    });

});

router.get('/music/file', async function (ctx, next) {

    // 根据 name 值，获取相关的音乐文件信息
    let filename = ctx.query.name;
    let filepath = musicPath + '\\' + filename;

    // 读取音乐文件信息
    let fileData = await new Promise(function (resolve, reject) {
        fs.readFile(filepath, function (err, data) {
            resolve(data);
        });
    });
    ctx.body = fileData
});

module.exports = router;
