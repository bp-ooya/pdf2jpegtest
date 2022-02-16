//const blob = require('../lib/blobManager.js')

const { BlobServiceClient } = require("@azure/storage-blob");
const fs = require("fs");
const util = require("util");
const pdf = require("pdf-poppler");
const path = require("path");
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const connectionString = process.env.AzureWebJobsStorage;

var Jimp = require("jimp");

module.exports = {
  // PDFファイルをJpgへ変換してStorageへ保管する
  async pdfToJpg(fileName, context) {
    var blobContainerName = "logitemtest";
    let encodedData;

    // Azure Blob Storageより取得
    const downloadImage = async () => {
      console.log("start");
      //try{
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      var blobContainerClient =
        blobServiceClient.getContainerClient("logitemimage");
      var blockBlobClient = blobContainerClient.getBlockBlobClient(
        `${fileName}.pdf`
      );
      var downloadBlockBlobResponse = await blockBlobClient.download(0);
      encodedData = await streamToBuffer(
        downloadBlockBlobResponse.readableStreamBody
      );

      console.log(`Blob "${fileName}" is downloaded`);
      //}catch(error){
      //     context.log("Error:", error.message);
      // }
    };

    await downloadImage();

    await writeFileAsync(
      path.join(process.env.TMP, `${fileName}.pdf`),
      encodedData,
      "binary"
    ).catch((e) => {
      console.log(`file error: ${e}`);
    });

    // Convert PDF to JPEG
    await pdf.convert(path.join(process.env.TMP, `${fileName}.pdf`), {
      format: "jpg",
      out_dir: process.env.TMP,
      out_prefix: fileName,
      page: 2,
      scale: 2048,
    });

    const buff = await readFileAsync(
      path.join(process.env.TMP, `${fileName}-2.jpg`)
    );

    var blobName1 = `${fileName}_WeatherForecast1.jpg`;
    await this.clipImage(buff, blobName1, 0, 280, 730, context).catch(
      async (e) => {
        console.log(`error: ${e}`);
      }
    );
    // WaveChart
    var blobName2 = `${fileName}_WeatherForecast2.jpg`;
    await this.clipImage(buff, blobName2, 0, 1050, 730, context).catch(
      async (e) => {
        console.log(`error: ${e}`);
      }
    );

    // 切り出しが終わったら元ファイルを削除
    fs.unlinkSync(path.join(process.env.TMP, `${fileName}.pdf`));
    fs.unlinkSync(path.join(process.env.TMP, `${fileName}-2.jpg`));

    async function streamToBuffer(readableStream) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
          chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
      });
    }
  },

  // 画像ファイルのクリップ
  async clipImage(buff, blobName, x, y, height, context) {
    var image = await Jimp.read(buff)
      .then((image) => {
        return image.crop(x, y, image.bitmap.width, height);
      })
      .catch((err) => {
        context.log(err);
      });

    // バイナリへ変換
    const buf = await image.getBufferAsync(Jimp.MIME_JPEG);
    // ファイルをStorageへアップロード
    //await blob.upload(blobName, buf)

    // 保存Storage(外部から閲覧不可)
    const upload = async () => {
      //        try{
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      var blobContainerClient =
        blobServiceClient.getContainerClient("logitemimage");
      var blockBlobClient = blobContainerClient.getBlockBlobClient(blobName);
      await blockBlobClient
        .upload(buf, Buffer.byteLength(buf))
        .catch(async (e) => {
          console.log(`error: ${e}`);
        });
      context.log(`Blob "${blobName}" is uploaded`);
      // }catch(err){
      //   context.log("Error:", err.message);
      // };
    };

    upload();
  },
};
