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
imageWidth = env['IMAGE_WIDTH']
imageHeight = env['IMAGE_HEIGHT']
imageOutputDir = env['THUMBNAIL_OUTPUT_DIR']
numberOfImages = env['NUMBER_OF_IMAGES']

def handler(event, context):
    """
    Entry point for lambda.
    """
    logger.info("tnc - handler called")

    # message
    message = "talkncloud performance test"

    # download each file
    s3 = boto3.client('s3')
    s3.download_file(bucketName, 'perf-thumbnail.jpg', imageOutputDir)

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

def getImages():
    """
    Select X random images from the bucket. Return list.
    """

    logger.info("tnc - getImages called")

    allImages = bucketName.get_all_keys()
    randomImages = random.sample(allImages, numberOfImages)

    return randomImages

def resizeImage(images):
    """
    Resize the image to a thumbnail.
    """
    logger.info("tnc - resizeImage called")
    
    # resize the image
    for image in images:
        imageObject = Image.open(image)
        imageObject.thumbnail((imageWidth, imageHeight))
        imageObject.save(imageOutputDir + '/' + image)
        logger.info("tnc - resizeImage done: " + image)
    

if __name__ == "__main__":
    """ 
    Used for local testing
    """
    test = handler(None, None)
    print(test)