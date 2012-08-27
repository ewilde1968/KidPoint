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
    
    def addPointEvent(self, pointCount):
        newE = pointevent.PointEvent( parent=self.parent(), points=pointCount)
        newE.put()
        
        if not self.events:
            self.events = []
        self.events.append( newE.key())

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

    def Merge(self,inDict):
        for k in inDict:
            v = inDict[k]
            if k == 'kidName':
                self.kidName = v
            if k == 'events':
                # must be a new event and contain points
                newE = pointevent.PointEvent(parent=self.parent(),points=v['points'])
                newE.put()
                self.events.append(newE.key())
            if k == 'imageBlob':
                self.imageBlob = v
