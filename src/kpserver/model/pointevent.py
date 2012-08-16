'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import db

import datetime
import json

import loginerror


class PointEvent(db.Model):
    '''
    An event that provided plus or minus points
    '''
    dt = db.DateTimeProperty(auto_now_add=True)
    points = db.IntegerProperty(required=True)

    def getJSONDict(self):
        dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime.datetime) else None
        dtStr = json.dumps(self.dt,default=dthandler)
        outputDict = { 'dt':dtStr, 'points':self.points, 'key':str(self.key()) }

        return outputDict
    
    def toJSON(self):
        outputDict = self.getJSONDict()
        result = json.dumps( outputDict)
        return result

def fromJSON( jo):
    '''
    Decoder for PointEvent JSON objects.
    
    Required components: points
    Optional components: key
    Ignored components:  dt
    
    Any events passed as part of the JSON string to a Kid object are considered new pointevents
    for the kid.
    '''
    try:
        if 'key' in jo:
            return PointEvent.get( jo['key'])   # pointevents are static

        val = int(jo['points'])
        if val == 0:
            return None

        return PointEvent( points=val)  # raise if malformed object
    except:
        raise loginerror.LoginError( 'unexpected error in pointevent.fromJSON')
