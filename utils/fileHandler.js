const fs = require("fs");
const { promiser } = require("./promiser");

exports.handleFileUpload = (req) => {

  return promiser(new Promise((resolve, reject) => {
    let invalidImageFormat = !["image/jpeg", "image/jpg", "image/png"].includes(
      req.payload.image.hapi.headers["content-type"]
    );
    if (invalidImageFormat) return reject(new Error("INVALID IMAGE FORMAT"));
    const fileName = req.payload.image.hapi.filename;
    const data = req.payload.image._data;

    fs.writeFile(`./public/uploads/${fileName}`, data, (error) => {
      if (error) {
        reject(error)
      }
      resolve(`${req.info.host}/uploads/${fileName}`);
    });
  }))
};

exports.removeFile = (fileName) => {
  return fs.rmSync(`public/uploads/${fileName}`, {
    force: true,
  });
};
