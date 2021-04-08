"use strict";
const athBucket = process.env.ATH_BUCKET;
const athWorkgroup = process.env.ATH_WG;
const athCatalog = process.env.ATH_CAT;
const dynamoDb = process.env.DYN_TABLE;

const AthenaExpress = require("athena-express"),
	aws = require("aws-sdk");

const athenaExpressConfig = {
	aws,
	catalog: athCatalog,
	db: "default",
	workgroup: athWorkgroup,
	s3: "s3://" + athBucket,
	getStats: true
};
const athenaExpress = new AthenaExpress(athenaExpressConfig);

exports.handler = async (event, context, callback) => {
	const sqlQuery = "SELECT count(*) from " + dynamoDb

	try {
		let results = await athenaExpress.query(sqlQuery);
		callback(null, results);
	} catch (error) {
		callback(error, null);
	}
};