#!/usr/bin/python

"""
Save this file as server.py
>>> python server.py 0.0.0.0 8001
serving on 0.0.0.0:8001

or simply

>>> python server.py
Serving on localhost:8000

You can use this to test GET and POST methods.

"""

import SimpleHTTPServer
import SocketServer
import logging
import cgi
import sys
import json
import simplejson
import time


if len(sys.argv) > 2:
    PORT = int(sys.argv[2])
    I = sys.argv[1]
elif len(sys.argv) > 1:
    PORT = int(sys.argv[1])
    I = ""
else:
    PORT = 8000
    I = ""


current_milli_time = lambda: int(round(time.time() * 1000))

class ServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):

    def do_GET(self):
        logging.warning("======= GET STARTED =======")
        # logging.warning("GET is not supported.")
        logging.warning(self.headers)
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        logging.warning("======= POST STARTED =======")
        logging.warning(self.headers)
        
        data_string = self.rfile.read(int(self.headers['Content-Length']))
        # print "data_string: "
        # print data_string
        data = simplejson.loads(data_string)
        # print "json data: "
        # print data

        response = {}
        if data['system']['mode'] == 'off':
            response = {"path": "system.mode", "value": "head"}
        else:
            response = {"time": current_milli_time()}

        # Send a repsonse
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        # self.wfile.write(json.dumps({'system.mode': 'head'}))
        self.wfile.write(json.dumps(response))

Handler = ServerHandler

httpd = SocketServer.TCPServer(("", PORT), Handler)

print "@rochacbruno Python http server version 0.1 (for testing purposes only)"
print "Serving at: http://%(interface)s:%(port)s" % dict(interface=I or "localhost", port=PORT)
httpd.serve_forever()
