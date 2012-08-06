#!/usr/bin/python
import optparse
import sys
# Install the Python unittest package before you run this script.
import unittest

USAGE = """%prog SDK_PATH TEST_PATH
Run unit tests for App Engine apps.

SDK_PATH    Path to the SDK installation
TEST_PATH   Path to package containing test modules"""


def main(sdk_path, test_path):
    sys.path.insert(0, sdk_path)
    import dev_appserver
    dev_appserver.fix_sys_path()
    suite = unittest.loader.TestLoader().discover(test_path)
    unittest.TextTestRunner(verbosity=2).run(suite)


if __name__ == '__main__':
    parser = optparse.OptionParser(USAGE)
    options, args = parser.parse_args()

    # model tests
    SDK_PATH = '/usr/local/google_appengine'
    TEST_PATH = 'src/kpserver/unittests'
    main(SDK_PATH, TEST_PATH)
    