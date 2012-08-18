'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import testbed
from google.appengine.ext import db

import unittest
import json

from model import pointevent


class DemoTestCase(unittest.TestCase):

    def setUp(self):
        # First, create an instance of the Testbed class.
        self.testbed = testbed.Testbed()
        # Then activate the testbed, which prepares the service stubs for use.
        self.testbed.activate()
        # Next, declare which service stubs you want to use.
        self.testbed.init_datastore_v3_stub()

    def tearDown(self):
        self.testbed.deactivate()

    def testCreatePointEvent(self):
        # mimic the POST data from the client's account creation page
        points = "3"
        postData = '{ "points":"' + points + '" }'

        result = json.JSONDecoder(object_hook=pointevent.fromJSON).decode(postData)

        self.assertIsNotNone(result)
        self.assertEqual( result.points, int( points))

    def testGetPointEvent(self):
        points = 3
        pe = pointevent.PointEvent( points=points)
        pe.put()
        
        result = db.get( pe.key())

        # test the account values
        self.assertIsNotNone(result)
        self.assertEqual( result.points, points)
        
        # test the json encoder
        resultStr = pe.toJSON()
        self.assertIsNotNone(resultStr)
        result = json.JSONDecoder(object_hook=pointevent.fromJSON).decode(resultStr)
        self.assertIsNotNone(result)
        self.assertEqual( result.points, int( points))


if __name__ == '__main__':
    unittest.main()    
