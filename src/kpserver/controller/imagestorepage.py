'''
Created on Aug 6, 2012

@author: ewilde
'''
import webapp2
import logging

from google.appengine.api import images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

from model import kid


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

            if not k:
                raise ImageStoreError( 'no Kid data available')

            if k.imageBlob:
                img = images.Image( blob_key=k.imageBlob)

                widthInfo = self.request.get('width')
                if not widthInfo:
                    width = 320
                else:
                    width = int( widthInfo)
                    
                heightInfo = self.request.get('height')
                if not heightInfo:
                    height = 480
                else:
                    height = int( heightInfo)
                
                img.resize(width, height)
                img.im_feeling_lucky()
                outImg = img.execute_transforms(output_encoding=images.JPEG)
                
                self.response.headers['Content-Type'] = "image/jpeg"
                self.response.out.write( outImg)
            else:
                self.error(404)

        except ImageStoreError as e:
            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"errorMsg":"unexpected error in ImageStorePage GET."}')
            raise


class ImageStoreUpload(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
        try:
            logging.debug( 'ImageStoreUpload:POST')
            upload_files = self.get_uploads('file')  # 'file' is file upload field in the form
            blob_info = upload_files[0]
            
            if blob_info:
                logging.debug( 'found BlobInfo object')
                logging.debug( 'mime type:' + blob_info.content_type)
                logging.debug( 'filename: ' + blob_info.filename)
                logging.debug( 'size:     ' + str(blob_info.size))

            kidID = self.request.get('kid')
            try:
                kidID = int( kidID)
                k = kid.Kid.get_by_id(kidID)
            except:
                k = kid.getKidByName(kidID)

            logging.debug( 'found kid: ' + k.kidName)
            k.setImage( blob_info)
            k.put()

            self.response.out.write(k.toJSON())

        except ImageStoreError as e:
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.out.write('{"errorMsg":"unexpected error in ImageStorePage POST."}')
            raise

        self.response.headers['Content-Type'] = "text/json"


class BlobStorePage(webapp2.RequestHandler):
    '''
    API to store portrait data in blobstore, getting the upload url
    '''
    def get(self):
        try:
            logging.debug( 'BlobStorePage:GET')
            uploadURL = blobstore.create_upload_url('/imagestoreupload')
            logging.debug( uploadURL)

            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"uploadURL":"' + uploadURL + '"}')

        except ImageStoreError as e:
            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.headers['Content-Type'] = "text/json"
            self.response.out.write('{"errorMsg":"unexpected error in ImageStorePage GET."}')

