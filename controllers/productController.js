const request = require("request");

const { removeFile, handleFileUpload } = require("../utils/fileHandler");
const { promiser } = require("../utils/promiser");

require("dotenv").config();

const { DATABASEURL, GETDOCSURL } = process.env;

const getproductById = async (id) => {
  const [data, error] = await promiser(
    new Promise((resolve, reject) => {
      request(
        {
          url: `${DATABASEURL}/${id}`,
        },
        (err, res, body) => {
          if (err) {
            reject(err);
          } else {
            resolve(JSON.parse(body));
          }
        }
      );
    })
  );
  if (error) {
    return error;
  }
  return data;
};

exports.getProducts = async (req, h) => {
  const [data, error] = await promiser(
    new Promise((resolve, reject) => {
      request(
        {
          url: GETDOCSURL,
        },
        (err, res, body) => {
          if (err) {
            reject(err);
          } else {
            resolve(body);
          }
        }
      );
    })
  );
  if (error) {
    return error;
  }
  return data;
}

exports.addProduct = async (req, h) => {
  const [data, error] = await promiser(
    new Promise(async (resolve, reject) => {
      const [image, error] = await handleFileUpload(req);
      if (error) {
        return reject(error);
      }
      request(
        {
          method: "POST",
          url: DATABASEURL,
          headers: { "content-type": "application/json" },
          json: { ...req.payload, image },
        },
        (err, res, body) => {
          if (err) {
            reject(err);
          }
          resolve(body);
        }
      );
    })
  );
  if (error) {
    return { message: error.message };
  }
  return data;
}

exports.updateProduct = async (req, h) => {
  const [data, error] = await promiser(
    new Promise(async (resolve, reject) => {
      const prevData = await getproductById(req.payload._id);
      if (req.payload.image) {
        if (!prevData.image) return reject("Image not found");
        const fileName = prevData.image.split("/").pop();
        removeFile(fileName);
        const [image, error] = await handleFileUpload(req);
        if (error) {
          return reject(error);
        }
        req.payload = { ...req.payload, image };
      }
      request(
        {
          method: "PUT",
          url: `${DATABASEURL}/${req.payload._id}`,
          headers: { "content-type": "application/json" },
          json: { ...prevData, ...req.payload },
        },
        (err, res, body) => {
          if (err) {
            reject(err);
          }
          resolve(body);
        }
      );
    })
  );
  if (error) {
    return { message: error.message };
  }
  return data;
}

exports.deleteProduct = async (req, h) => {
  const [data, error] = await promiser(
    new Promise(async (resolve, reject) => {
      const { image } = await getproductById(req.payload._id);
      removeFile(image.split("/").pop());
      request(
        {
          method: "DELETE",
          url: `${DATABASEURL}/${req.payload._id}?rev=${req.payload._rev}`,
        },
        (err, res, body) => {
          if (err) {
            reject(err);
          }
          resolve(body);
        }
      );
    })
  );
  if (error) {
    return { message: error.message };
  }
  return data;
}