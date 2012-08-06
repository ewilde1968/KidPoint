'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import db

import json

import pointevent
import loginerror


class Kid(db.Model):
    '''
    Basic kid class for tracking an individual child's behavior
    '''
    kidName = db.StringProperty(required=True)
    events = db.ListProperty(db.Key)
    imageURL = db.StringProperty()

    def getJSONDict(self):
        outputDict = { 'kidName': self.kidName, 'imageURL':self.imageURL, 'key':self.key().id()}

        if self.events and len(self.events) > 0:
            outputDict['events'] = []
            for e in self.events:
                outputDict['events'].append( db.get(e).getJSONDict())

        return outputDict

    def toJSON(self):
        outputDict = self.getJSONDict()
        result = json.dumps(outputDict)
        return result
    

def getKidByName( nm):
    q = Kid.all()
    q.filter('kidName = ', nm)
    result = q.get()

    return result       # may be None result


def fromJSON( jo):
    '''
    Decoder for Kid JSON objects.
    
    Required components: kidName
    Optional components: key, all other member variables
    
    If the required kidName component is not a part of the JSON string, then
    assume it is a sub-object. The only sub-object available is the pointevent.
    
    Any events passed as part of the JSON string are considered new pointevents
    for the kid.
    '''
    try:
        if not 'kidName' in jo:
            # try to create a pointevent instead
            try:
                peResult = pointevent.fromJSON(jo)
                return peResult
            except loginerror.LoginError:
                raise
            except:
                raise loginerror.LoginError( 'unable to create Kid subobject as PointEvent')
                
        # looks like its a Kid object, create one
        result = None
        if 'key' in jo:
            result = Kid.get_by_id( jo['key'])

        # kidName must be in jo
        if not result:
            # check to see if the kid already exists by kidName
            result = getKidByName( jo['kidName'])
            if not result:
                result = Kid( kidName=jo['kidName'])
                result.touched = True
        elif result.kidName != jo['kidName']:
            result.kidName = jo['kidName']
            result.touched = True

        # result must be created by this time
        if 'imageURL' in jo and jo['imageURL'] != result.imageURL:
            result.imageURL = jo['imageURL']
            result.touched = True

        if 'events' in jo:
            # any events passed into the JSON string must be new ones
            result.touched = True

            if not result.events:
                result.events = []
            for e in jo['events']:
                if e:   # could have None object if new point object had zero points
                    # all are PointEvent objects at this point
                    e.put() # save these new events in the datastore
                    result.events.append( e.key())

        return result
    except loginerror.LoginError:
        raise
    except:
        raise loginerror.LoginError('unexpected error in account.fromJSON')
