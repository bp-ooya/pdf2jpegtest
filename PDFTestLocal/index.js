var pdfToImage = require('./pdfToImage');
const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
		
	pdfToImage.pdfToJpg("test", context);
		
    context.res = {
        // status: 200, /* Defaults to 200 */
        status: 200,
        body: 'OK'
    };	    

}