const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const findChrome = require("chrome-finder");
const UglifyJsPlugin = require("webpack/lib/optimize/UglifyJsPlugin");
const DefinePlugin = require("webpack/lib/DefinePlugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const EndWebpackPlugin = require("end-webpack-plugin");
const { WebPlugin } = require("web-webpack-plugin");
const ghpages = require("gh-pages");
const puppeteer = require("puppeteer");

function publishGhPages() {
  return new Promise((resolve, reject) => {
    ghpages.publish(outputPath, { dotfiles: true }, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const outputPath = path.resolve(__dirname, ".public");
module.exports = {
  output: {
    path: outputPath,
    publicPath: "",
    filename: "[name]_[chunkhash:8].js"
  },
  resolve: {
    // 加快搜索速度
    modules: [path.resolve(__dirname, "node_modules")],
    // es tree-shaking
    mainFields: ["jsnext:main", "browser", "main"]
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        // 提取出css
        loaders: ExtractTextPlugin.extract({
          fallback: "style-loader",
          // 压缩css
          use: ["css-loader?minimize", "postcss-loader", "sass-loader"]
        }),
        include: path.resolve(__dirname, "src")
      },
      {
        test: /\.css$/,
        // 提取出css
        loaders: ExtractTextPlugin.extract({
          fallback: "style-loader",
          // 压缩css
          use: ["css-loader?minimize", "postcss-loader"]
        })
      },
      {
        test: /\.(gif|png|jpe?g|eot|woff|ttf|svg|pdf)$/,
        loader: "base64-inline-loader"
      }
    ]
  },
  entry: {
    main: "./src/main.js"
  },
  plugins: [
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new UglifyJsPlugin({
      // 最紧凑的输出
      beautify: false,
      // 删除所有的注释
      comments: false,
      compress: {
        // 在UglifyJs删除没有用到的代码时不输出警告
        warnings: false,
        // 删除所有的 `console` 语句，可以兼容ie浏览器
        drop_console: true,
        // 内嵌定义了但是只用到一次的变量
        collapse_vars: true,
        // 提取出出现多次但是没有定义成变量去引用的静态值
        reduce_vars: true
      }
    }),
    new WebPlugin({
      template: "./src/index.html",
      filename: "index.html"
    }),
    new ExtractTextPlugin({
      filename: "[name]_[contenthash:8].css",
      allChunks: true
    }),
    new EndWebpackPlugin(async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--disable-gpu", //禁用GPU硬件加速
          "--disable-dev-shm-usage", //禁止使用 /dev/shm 共享内存
          "--disable-setuid-sandbox", //禁用setuid沙箱（仅限Linux）
          "--no-sandbox", //停用沙箱
          "--single-process", //将Dom解析和渲染放到同一进程
          "--no-first-run", //跳过 Chromium 首次运行检查
          "--no-zygote" //禁用使用zygote进程来分叉子进程
        ]
      });
      const page = await browser.newPage();

      // await page.setViewport({
      //   width: 1440,
      //   height: 900
      // });

      await page.goto("http://localhost:8080", {
        waitUntil: "networkidle2",
        timeout: 60000 // 10s超时
      });
      // await delay(100);

      await page.pdf({
        path: "./pdf/前端工程师_蒋灵斌_resume.pdf",
        format: "A4",
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px"
        }
      });

      console.log("PDF生成在 ./src/pdf 中了");
      browser.close();
      // 自定义域名
      // fs.writeFileSync(path.resolve(outputPath, "CNAME"), "resume.wuhaolin.cn");

      // // await publishGhPages();

      // // 调用 Chrome 渲染出 PDF 文件
      // const chromePath = findChrome();
      // spawnSync(chromePath, [
      //   "--headless",
      //   "--disable-gpu",
      //   `--print-to-pdf=${path.resolve(outputPath, "resume.pdf")}`,
      //   "http://resume.wuhaolin.cn" // 这里注意改成你的在线简历的网站
      // ]);

      // 重新发布到 ghpages
      // await publishGhPages();
    })
  ]
};
