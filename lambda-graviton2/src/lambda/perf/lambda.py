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
    payload = {"message": message, "arch": architecture}

    response = {
        "statusCode": 200,
        "body": json.dumps(payload)
    }

    return response


if __name__ == "__main__":
    """ 
    Used for local testing
    """
    test = handler(None, None)
    print(test)