"""
    Description: Simple response for the lambda load testing comparison
                 x86 vs arm / graviton2.

    Author: Mick Jacobsson (https://www.talkncloud.com)
    Repo: https://github.com/talkncloud/aws/lambda-graviton2

"""

import logging
import boto3
import os
import platform
import json
from PIL import Image
import random

logger = logging.getLogger()
logging.basicConfig()
logger.setLevel(logging.INFO)

# Get the environment variables
env = os.environ
bucketName = env['BUCKET']
imageOutputDir = env['IMAGE_OUTPUT_DIR']
imageWidth = int(env['IMAGE_WIDTH'])
imageHeight = int(env['IMAGE_HEIGHT'])
numberOfImages = int(env['NUMBER_OF_IMAGES'])

# S3
s3 = boto3.client('s3')

def handler(event, context):
    """
    Entry point for lambda.
    """
    logger.info("tnc - handler called")

    try:
        # message
        message = "talkncloud performance test"

        # get the arch, should tell us if its x86 or arm
        architecture = platform.platform()

        # random sample
        randomImages = getImages()

        # resize each image
        resizeImage(randomImages)

        # all payload
        payload = {"message": message, "files": randomImages,"arch": architecture, "boto3": boto3.__version__}

        response = {
            "statusCode": 200,
            "body": json.dumps(payload)
        }

        return response
    except Exception as e:
        logger.error("tnc - handler - error: " + str(e))

def getImages():
    """
    Select X random images from the bucket. Return list.
    """

    logger.info("tnc - getImages called")

    try:
        allImageObjects = s3.list_objects_v2(Bucket=bucketName)['Contents']
        allImages = []
        for image in allImageObjects:
            allImages.append(image['Key'])
        randomImages = random.sample(allImages, numberOfImages)

        return randomImages
    except Exception as e:
        logger.error("tnc - getImages - error: " + str(e))

def resizeImage(images):
    """
    Resize the image to a thumbnail.
    """
    logger.info("tnc - resizeImage called")
    
    try:
        # resize the image
        for image in images:
            logger.info("tnc - resizeImage - resizing image - " + image)
            imageDownload = s3.get_object(Bucket=bucketName, Key=image)
            imageObject = Image.open(imageDownload['Body'])
            imageObject.thumbnail((imageWidth, imageHeight))
            # imageObject.save(imageOutputDir + '/' + image) # don't need to save it, might use later
            logger.info("tnc - resizeImage completed: " + image)
    except Exception as e:
        logger.error("tnc - resizeImage - error: " + str(e))
    

if __name__ == "__main__":
    """ 
    Used for local testing
    """
    test = handler(None, None)
    print(test)