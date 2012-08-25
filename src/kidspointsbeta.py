import webapp2

from controller import accountpage
from controller import imagestorepage
from controller import loginpage


class HomePage(webapp2.RequestHandler):
    '''
    Kid Point home page - index.html redirect
    '''
    def get(self):
        self.redirect("/assets/index.html", permanent=True)

  
app = webapp2.WSGIApplication([('/account', accountpage.AccountPage),
                               ('/login', loginpage.LoginPage),
                               ('/imagestore', imagestorepage.ImageStorePage),
                               ('/imagestoreupload', imagestorepage.ImageStoreUpload),
                               ('/blobstore', imagestorepage.BlobStorePage),
                               ('/', HomePage)
                               ],
                              debug=True)
