// Imports the Google Cloud client library
const { Storage } = require('@google-cloud/storage');

const BUCKET_NAME = 'paws-furever-gallery';

// Creates a client
const storage = new Storage();
async function postCS(files) {
  let picture1URL = '';
  let picture2URL = '';
  let picture3URL = '';

  try {

    const picture1 = files.Picture1_URL_Primary;
    if (picture1) {
      picture1URL = await uploadFile(picture1);
    }

    const picture2 = files.Picture2_URL;
    if (picture2) {
      picture2URL = await uploadFile(picture2);
    }

    const picture3 = files.Picture3_URL;
    if (picture3) {
      picture3URL = await uploadFile(picture3);
    }
  } catch (error) {
    console.error(error);
  }

  return [picture1URL, picture2URL, picture3URL];
}

async function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const bucket = storage.bucket(BUCKET_NAME);
    const bucketFile = bucket.file(file.name);
    const stream = bucketFile.createWriteStream();

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', () => {
      publicURL = `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`;
      resolve(publicURL);
    });

    stream.end(file.data);
  });
}

module.exports = {
  postCS: postCS
}