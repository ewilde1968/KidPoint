'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import db
from google.appengine.ext import blobstore

import json

import pointevent


class Kid(db.Model):
    '''
    Basic kid class for tracking an individual child's behavior
    '''
    kidName = db.StringProperty(required=True)
    events = db.ListProperty(db.Key)
    imageBlob = blobstore.BlobReferenceProperty();

    def getJSONDict(self):
        outputDict = { 'kidName': self.kidName, 'key':str(self.key())}
        if self.imageBlob:
            outputDict['blobKey'] = str(self.imageBlob.key())

        if self.events and len(self.events) > 0:
            outputDict['events'] = []
            for e in self.events:
                outputDict['events'].append( db.get(e).getJSONDict())

        return outputDict

    def toJSON(self):
        outputDict = self.getJSONDict()
        result = json.dumps(outputDict)
        return result
    
    def setImage(self, imageBI):
        self.imageBlob = imageBI.key()
        
    def deleteImage(self):
        if self and self.imageBlob:
            self.imageBlob.delete()
            self.imageBlob = None
        
    def moveToAncestor(self, ancestor):
        if ancestor.is_saved() and self.parent_key() == ancestor.key():
            return self
        
        newKid = Kid( parent=ancestor, kidName=self.kidName, imageBlob=self.imageBlob)
        newKid.events = []
        for e in self.events:
            e = db.get(e)
            newE = pointevent.PointEvent( parent=ancestor, points=e.points)
            newE.dt = e.dt
            newE.put()
            
            newKid.events.append(newE.key())

            e.delete()  # e is guaranteed to have been saved previously

        newKid.put()
        return newKid


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
            except:
                raise
                
        # looks like its a Kid object, create one
        result = None
        if 'key' in jo:
            result = Kid.get( jo['key'])

        # kidName must be in jo
        if not result:
            result = Kid( kidName=jo['kidName'])
            result.touched = True
        elif result.kidName != jo['kidName']:
            result.kidName = jo['kidName']
            result.touched = True

        # result must be created by this time
        # image blob handled through imagestorepage API

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
    except:
        raise
