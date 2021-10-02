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

logger = logging.getLogger()
logging.basicConfig()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Entry point for lambda.
    """
    logger.info("tnc - handler called")

    # message
    message = "talkncloud performance test"

    # get the arch, should tell us if its x86 or arm
    architecture = platform.platform()

    # all payload
    payload = {"message": message, "arch": architecture, "boto3": boto3.__version__}

    response = {
        "statusCode": 200,
        "body": json.dumps(payload)
    }
    
    # simple loop for processor, there are probably better ways to test this
    listAppend = []
    for item in range(10):
        someString = "i like"
        someString = someString + " pie"
        listAppend.append(someString)
        
        # number calculation
        # Source / Credit: https://github.com/alexdedyura/cpu-benchmark
        for x in range(1,1000):
          3.141592 * 2**x
        for x in range(1,10000):
          float(x) / 3.141592
        for x in range(1,10000):
          float(3.141592) / x
    
    return response

if __name__ == "__main__":
    """ 
    Used for local testing
    """
    test = handler(None, None)
    print(test)