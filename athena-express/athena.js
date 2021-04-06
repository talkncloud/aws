"use strict";

const AthenaExpress = require("athena-express"),
	aws = require("aws-sdk");

const athenaExpressConfig = {
	aws,
	catalog: "somecats",
	db: "default",
	workgroup: "somewg",
	s3: "s3://supercoolbucket",
	getStats: true
};
const athenaExpress = new AthenaExpress(athenaExpressConfig);

exports.handler = async (event, context, callback) => {
	const sqlQuery = "SELECT count(*) from dynamotable"

	try {
		let results = await athenaExpress.query(sqlQuery);
		callback(null, results);
	} catch (error) {
		callback(error, null);
	}
};