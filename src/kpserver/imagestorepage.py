'''
Created on Aug 6, 2012

@author: ewilde
'''
import webapp2
import logging

import kid


class ImageStoreError(ValueError):
    '''
    Error handling class for blob storage errors
    '''


class ImageStorePage(webapp2.RequestHandler):
    '''
    API to store portrait data
    '''
    def get(self):
        try:
            kInfo = self.request.get('kid')
            try:
                kidID = int( kInfo)
                k = kid.Kid.get_by_id(kidID)
            except:
                k = kid.getKidByName(kInfo)

            if k.imageBlob:
                self.response.headers['Content-Type'] = "image/png"
                
                if self.request.get('thumb') == 'true':
                    self.response.out.write( k.thumbnail)
                else:
                    self.response.out.write( k.imageBlob)
            else:
                self.error(404)

        except ImageStoreError as e:
            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"errorMsg":"unexpected error in ImageStorePage GET."}')


    def post(self):
        try:
            imageH = self.request.get('file')

            kidID = self.request.get('kid')
            try:
                kidID = int( kidID)
                k = kid.Kid.get_by_id(kidID)
            except:
                k = kid.getKidByName(kidID)

            logging.debug( 'found kid: ' + k.kidName)
            #k.setImage( imageH)
            k.put()

            self.response.out.write(k.toJSON())

        except ImageStoreError as e:
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            raise
            #self.response.out.write('{"errorMsg":"unexpected error in ImageStorePage POST."}')

        self.response.headers['Content-Type'] = "text/json"
