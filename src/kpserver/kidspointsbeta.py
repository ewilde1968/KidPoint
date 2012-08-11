import webapp2

import accountpage
import imagestorepage


class HomePage(webapp2.RequestHandler):
    '''
    Kid Point home page - index.html redirect
    '''
    def get(self):
        self.redirect("/android_assets/www/index.html", permanent=True)

  
app = webapp2.WSGIApplication([('/account', accountpage.AccountPage),
                               ('/imagestore', imagestorepage.ImageStorePage),
                               ('/', HomePage)
                               ],
                              debug=True)
