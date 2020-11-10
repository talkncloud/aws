import boto3
from datetime import datetime, timedelta, timezone
import logging
import os

#
# Logging: set up some logging, useful for debugging and nice to read in cloudwatch
#
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logging.info('tnc-ec2runner: begin program')

#
# Constants
#
# Thresholds are time in minutes, 1440 = 24 hours
THRESH_LOW = int(os.environ.get('THRESH_LOW'))
THRESH_MED = int(os.environ.get('THRESH_MED'))
THRESH_HIGH = int(os.environ.get('THRESH_HIGH'))
# Used to check if its tagged already, e.g. notification processed
TAGNAME_TNC = 'tnc-ec2runner'
# SNS arn
SNS_TOPIC = os.environ.get('SNS_TOPIC')

#
# findRegions: get all supported ec2 regions
# return: list
#
def findRegions():
    logging.info('tnc-ec2runner: findRegions')
    try:
        client = boto3.client('ec2')
        ec2Regions = client.describe_regions()
        logging.info('tnc-ec2runner: findRegions - OK')
        return ec2Regions['Regions']
    except:
        logging.error('tnc-ec2runner: findRegions - Error')
    
#
# checkEc2: for each region list running and stopped ec2 instances (remove tnc tag if stopped), depending on the three thresholds send notification
# return: object, calls formatting function for sns
#
def checkEc2():
    logging.info('tnc-ec2runner: checkEc2')
    try:
        # currentTime, lambda is UTC as is the EC2 launch time
        currentTime = datetime.now(timezone.utc) #.strftime('%Y-%m-%d %H:%M:%S%z')
        # Write a tag back? track with tags
        instanceMeta = []

        regions = findRegions()
        for region in regions:
            thisRegion = region['RegionName']
            logging.info('tnc-ec2runner: checkEc2 - region: ' + thisRegion)
            client = boto3.client('ec2', region_name=thisRegion) #, region_name='us-east-1'
            response = client.describe_instances()

            for r in response['Reservations']:
                #print(r)
                #LaunchTime, Tags, OwnerID (account), State
                for i in r['Instances']:
                    # state = stopped, running
                    # If the instance is stopped we've taken care of it, lets remove the tag so that if it starts we can run through
                    # the notification process again.
                    if i['State']['Name'] == "stopped":
                        if "Tags" in i:
                            tags = i["Tags"]                                
                            for tag in tags:
                                if tag["Key"] == TAGNAME_TNC:
                                    client.delete_tags(Resources=[i["InstanceId"]], Tags=[{"Key": TAGNAME_TNC}])
                                
                    # OK, instances are running, lets process based on launchTime and thresholds
                    if i['State']['Name'] == "running":
                        runTime = i['LaunchTime'] # Already object
                        runTimeObject = datetime.strptime(str(runTime), '%Y-%m-%d %H:%M:%S%z')
                                                
                        # Tags are optional
                        isTagged = ""
                        if "Tags" in i:
                            tags = i["Tags"]                                
                            for tag in tags:
                                if tag["Key"] == TAGNAME_TNC:
                                    isTagged = tag["Value"]
                        else:
                            tags = None

                        instance = [{ "region": thisRegion, "instanceId": i["InstanceId"], "instanceType": i["InstanceType"], "instanceState": i['State']['Name'], "tags": tags, "launchTime": str(runTimeObject)}]

                        # Our three thresholds, now - the threshold time defined
                        low = currentTime - timedelta(minutes=THRESH_LOW)
                        med = currentTime - timedelta(minutes=THRESH_MED)
                        high = currentTime - timedelta(minutes=THRESH_HIGH)

                        # run48 = two days ago
                        # currentTime = when ec2 was started, find out if current time is greater than two days ago
                        if high > runTime and isTagged != "high":
                            logging.info('tnc-ec2runner: checkEc2 - found ec2 HIGH threshold!')
                            instanceMeta.append(["high", instance])
                            client.create_tags(Resources=[i["InstanceId"]], Tags=[{"Key":TAGNAME_TNC, "Value":"high"}])
                        elif (med > runTime and high < runTime) and isTagged != "med":
                            logging.info('tnc-ec2runner: checkEc2 - found ec2 med threshold!')
                            instanceMeta.append(["med", instance])
                            client.create_tags(Resources=[i["InstanceId"]], Tags=[{"Key":TAGNAME_TNC, "Value":"med"}])
                        elif (low > runTime and med < runTime) and isTagged != "low":
                            logging.info('tnc-ec2runner: checkEc2 - found ec2 low threshold')
                            instanceMeta.append(["low", instance])
                            client.create_tags(Resources=[i["InstanceId"]], Tags=[{"Key":TAGNAME_TNC, "Value":"low"}])
                        else:
                            logging.info('tnc-ec2runner: checkEc2 - OK - found running but under thresholds')

        # Is there output to process?
        if instanceMeta:
            logging.info('tnc-ec2runner: checkEc2 - found ec2, count: ' + str(len(instanceMeta)))
            # send off for formatting before sns
            formatMessage(instanceMeta, len(instanceMeta))
    except:
        logging.error('tnc-ec2runner: checkEc2 - Error')

#
# formatMessage: loop through the ec2 object data and format as message for email
# parameters: meta = message object, status = string for subject (number of servers in alarm)
# return: dict, calls sns
#
def formatMessage(meta, status):
    logging.info('tnc-ec2runner: formatMessage')
    try:
        # We only send one email with a list, a single email may have many thresholds
        sub = "EC2 Alert [{status}] servers found running longer than expected".format(status=status)
        msg = """
                    -------------------------------------------------------------------------------------------------------------------
                    Summary of servers:
                    -------------------------------------------------------------------------------------------------------------------
            """
        for item in meta:
            # second elem is the data dict
            for inner in item[1]:
                # first elem is the threshold as string
                threshold = item[0]
                # items are tagged at this stage, pull out the threshold so we can use it in the notification

                msg += """
                    -------------------------------------------------------------------------------------------------------------------
                    {a:<20}    :   {region}
                    {b:<20}    :   {threshold}
                    {c:<20}    :   {instanceId}
                    {d:<20}    :   {instanceType}
                    {e:<20}    :   {instanceState}
                    {f:<20}    :   {launchTime}
                    {g:<20}    :   {tags}
                    -------------------------------------------------------------------------------------------------------------------
                    """.format(a='region', b = 'threshold', c = 'instanceId', d = 'instanceType', e = 'instanceState', f = 'launchTime (UTC)', g = 'tags', region=inner["region"], threshold=threshold, instanceId=inner["instanceId"], instanceType=inner["instanceType"], instanceState=inner["instanceState"], launchTime=inner["launchTime"], tags=inner["tags"], status=status)

        logging.info('tnc-ec2runner: formatMessage - OK - send to sns')
        publishSns(sub, msg)
    except:
       logging.error('tnc-ec2runner: formatMessage - Error')

#
# publishSns: send sns
# parameters: sub = string, msg = body of sns
#
def publishSns(sub, msg):
    logging.info('tnc-ec2runner: publishSns')
    try:
        topic_arn = SNS_TOPIC
        sns = boto3.client("sns")
        response = sns.publish(
            TopicArn=topic_arn,
            Message=msg,
            Subject=sub
        )
    except:
        logging.error('tnc-ec2runner: publishSns - Error')

def handler(event, context):
    # Kick this thing off
    try:
        checkEc2()
        return "Hooray! we did it"
    except:
        return "There was an error, check log"
        