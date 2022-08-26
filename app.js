const Hapi = require("@hapi/hapi");
const request = require("request");
const fs = require("fs");
const Joi = require("joi");

require("dotenv").config();

const { DATABASEURL, GETDOCSURL } = process.env;

const payload = {
  parse: true,
  multipart: {
    output: "stream",
  },
  maxBytes: 1000 * 1000 * 5,
};

//Init Server
const server = new Hapi.Server({
  port: 4000,
  host: "localhost",
});

const provision = async () => {
  //Plugin Register
  await server.register([{ plugin: require("inert") }]);

  server.route({
    method: "GET",
    path: "/uploads/{file}",
    handler: {
      directory: {
        path: "public/uploads/",
      },
    },
  });

  server.route({
    path: "/",
    method: "GET",
    handler: (req, h) => `<h1>THIS IS HOME PAGE.</h1>`,
  });

  //GET PRODUCTS
  server.route({
    path: "/products",
    method: "GET",
    handler: async (req, h) => {
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
    },
  });

  //ADD PRODUCT
  server.route({
    path: "/product",
    method: "POST",
    options: {
      validate: {
        payload: validateProductDetails([
          "name",
          "description",
          "price",
          "quantity",
          "image",
        ]),
      },
      payload,
    },
    handler: async (req, h) => {
      const [data, error] = await promiser(
        new Promise(async (resolve, reject) => {
          const { image } = await handleFileUpload(req.payload.image);
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
    },
  });

  //UPDATE PRODUCT
  server.route({
    path: "/product",
    method: "PUT",
    options: {
      validate: {
        payload: validateProductDetails(["_id"], true),
      },
      payload,
    },
    handler: async (req, h) => {
      const [data, error] = await promiser(
        new Promise(async (resolve, reject) => {
          const prevData = await getproductById(req.payload._id);
          if (req.payload.image) {
            if (!prevData.image) return reject("Image not found");
            const fileName = prevData.image.split("/").pop();
            removeFile(fileName);
            const { image } = await handleFileUpload(req.payload.image);
            if (!image) reject("Invalid Image Format");
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
    },
  });

  //DELETE PRODUCT
  server.route({
    path: "/product",
    method: "DELETE",
    options: {
      validate: {
        payload: validateProductDetails(["_id", "_rev"]),
      },
    },
    handler: async (req, h) => {
      const [data, error] = await promiser(
        new Promise(async (resolve, reject) => {
          const { image } = await getproductById(req.payload._id);
          if (!image) return reject("Image not found");
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
    },
  });

  //Start Server
  await server.start((err) => {
    if (err) throw err;
    console.log("server is listening at", server.info.uri);
  });
};

provision();

const getproductById = (id) => {
  return new Promise((resolve, reject) => {
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
  });
};

const validateProductDetails = (keysArr, allowUnknown = false) => {
  const validationKeys = createValidationObject(keysArr);
  return allowUnknown
    ? Joi.object(validationKeys).options({ allowUnknown })
    : Joi.object(validationKeys);
};

const createValidationObject = (keysArr = []) => {
  let validationKeys = {};

  keysArr.forEach((key) => {
    switch (key) {
      case "name":
        validationKeys = {
          ...validationKeys,
          name: Joi.string().min(3).required(),
        };
        break;
      case "description":
        validationKeys = {
          ...validationKeys,
          description: Joi.string().min(5).required(),
        };
        break;
      case "price":
        validationKeys = { ...validationKeys, price: Joi.number().required() };
        break;
      case "quantity":
        validationKeys = {
          ...validationKeys,
          quantity: Joi.number().integer(),
        };
        break;
      case "image":
        validationKeys = { ...validationKeys, image: Joi.any().required() };
        break;
      case "_id":
        validationKeys = { ...validationKeys, _id: Joi.string().required() };
        break;
      case "_rev":
        validationKeys = { ...validationKeys, _rev: Joi.string().required() };
        break;
      default:
        return;
    }
  });
  return validationKeys;
};

const handleFileUpload = (file) => {
  return new Promise((resolve, reject) => {
    let invalidImageFormat = !["image/jpeg", "image/jpg", "image/png"].includes(
      file.hapi.headers["content-type"]
    );
    if (invalidImageFormat) reject("INVALID IMAGE FORMAT");
    const fileName = file.hapi.filename;
    const data = file._data;

    fs.writeFile(`./public/uploads/${fileName}`, data, (err) => {
      if (err) {
        reject(err);
      }
      resolve({
        image: `${server.info.uri}/uploads/${fileName}`,
      });
    });
  });
};

const removeFile = (fileName) => {
  fs.rmSync(`public/uploads/${fileName}`, {
    force: true,
  });
  return;
};

const promiser = async (promise) => {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error];
  }
};
