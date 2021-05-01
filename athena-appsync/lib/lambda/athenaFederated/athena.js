"use strict";
const cacheBucket = process.env.CACHE_BUCKET;
const athBucket = process.env.ATH_BUCKET;
const athWorkgroup = process.env.ATH_WG;
const athCatalog = process.env.ATH_CAT;
const dynamoDb = process.env.DYN_TABLE;
const cacheMins = process.env.CACHE_MINS;

const AthenaExpress = require("athena-express"),
	aws = require("aws-sdk");

const s3 = new aws.S3({ apiVersion: '2006-03-01' });

exports.handler = async (event, context, callback) => {
	const sqlQueryCount = 'SELECT COUNT(DISTINCT(title)) as count FROM "' + dynamoDb + '"' +
							' CROSS JOIN UNNEST(info.genres) AS t(genres) ' +
								' WHERE genres in (\'Horror\', \'Thriller\')'
	
	const sqlQueryData = 'SELECT title, info.genres FROM "' + dynamoDb + '"' +
							' CROSS JOIN UNNEST(info.genres) AS t(genres) ' +
								' WHERE genres in (\'Horror\', \'Thriller\')'

	const athenaExpressConfig = {
		aws,
		catalog: athCatalog,
		db: "default",
		workgroup: athWorkgroup,
		s3: "s3://" + athBucket, // this didn't accept prefixes?
		getStats: true
	};

	const athenaExpress = new AthenaExpress(athenaExpressConfig);

	try {
		let args = event.arguments
		let payload, results, data;

		if (args.param == "count") {
			let cache = await checkCache(args.param);
			if (cache == false) {
				results = await athenaExpress.query(sqlQueryCount);			
				const s3source = results.S3Location.replace('s3://', '');
				const params = {
					Bucket: cacheBucket,
					CopySource: s3source,
					Key: 'current_count.csv',
				};
				await s3.copyObject(params).promise();
				// The actual data
				data = results.Items;
			} else {
				console.log('s3 select');
				let cacheData = await cacheSelect(args.param);
				console.log(cacheData);
				data = cacheData;
			}
		} else if (args.param == "data") {
			let cache = await checkCache(args.param);
			if (cache == false) {
				results = await athenaExpress.query(sqlQueryData);
				const s3source = results.S3Location.replace('s3://', '');
				const params = {
					Bucket: cacheBucket,
					CopySource: s3source,
					Key: 'current_data.csv',
				};
				await s3.copyObject(params).promise();
				// The actual data
				data = results.Items;
			} else {
				// use cached data
				let cacheData = await cacheSelect(args.param);
				console.log(cacheData);
				data = cacheData;
			}
		} else {
			callback('missing argument', null)
		}

		payload = {
			args: args,
			movies: data
		}

		callback(null, payload);

	} catch (error) {
		callback(error, null);
	}
};

async function checkCache(param) {
	// check the cache first

	const headParams = {
		Bucket: cacheBucket,
		Key: 'current_' + param + '.csv'
	}

	// Grab the meta-data info on the current cache file
	// check last modified timestamp and compare if
	// outside of cache time.
	const cacheRead = await s3.headObject(headParams).promise();


	let createdDatetime = new Date(decodeURIComponent(cacheRead.LastModified));
	let currentDate = new Date();
	currentDate.setMinutes(currentDate.getMinutes() - cacheMins);

	if (createdDatetime > currentDate) {
		console.log('greater')
		// cache is recent, don't need to query athena
		return true
	} else {
		// cache is old, need to query athena
		return false
	}
};

async function cacheSelect(param) {
	try {
		// 1
		const query = 'SELECT * FROM s3object';
		// 2
		const bucket = cacheBucket;
		const key = 'current_' + param + '.csv';    // 3
		const params = {
		  Bucket: bucket,
		  Key: key,
		  ExpressionType: 'SQL',
		  Expression: query,
		  InputSerialization: {
			CSV: {
				FileHeaderInfo: 'USE',
				RecordDelimiter: '\n',
				FieldDelimiter: ','
			}
		  },
		  OutputSerialization: {
			JSON: {
			  RecordDelimiter: ','
			}
		  }
		}    // 4
		const data = await getDataUsingS3Select(params);
		// context.succeed(data);
		console.log(data)
		return data
	  } catch (error) {
		return error
	  }
};

// https://medium.com/@thetrevorharmon/how-to-use-s3-select-to-query-json-in-node-js-5b2c5dca6dfc
const getDataUsingS3Select = async (params) => {
	return new Promise((resolve, reject) => {
	  s3.selectObjectContent(params, (err, data) => {
		if (err) { reject(err); }
  
		if (!data) {
		  reject('Empty data object');
		}
  
		// This will be an array of bytes of data, to be converted
		// to a buffer
		const records = []
  
		// This is a stream of events
		data.Payload.on('data', (event) => {
		  // There are multiple events in the eventStream, but all we 
		  // care about are Records events. If the event is a Records 
		  // event, there is data inside it
		  if (event.Records) {
			records.push(event.Records.Payload);
		  }
		})
		.on('error', (err) => {
		  reject(err);
		})
		.on('end', () => {
		  // Convert the array of bytes into a buffer, and then
		  // convert that to a string
		  let dataString = Buffer.concat(records).toString('utf8');
  
		  // remove any trailing commas
		  dataString = dataString.replace(/\,$/, '');
  
		  // Add into JSON 'array'
		  dataString = `[${dataString}]`;
  
		  try {
			const data = JSON.parse(dataString);
			resolve(data);
		  } catch (e) {
			reject(new Error(`Unable to convert S3 data to JSON object. S3 Select Query: ${params.Expression}`));
		  }
		});
	  });
	})
}

