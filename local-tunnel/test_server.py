import contextlib
import http.client
import io
import threading
import unittest

from server import Handler, MAX_BODY, ThreadingHTTPServer


class LocalTunnelTests(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def request(self, method, path, body=None):
        connection = http.client.HTTPConnection(*self.server.server_address, timeout=3)
        connection.request(method, path, body)
        response = connection.getresponse()
        result = response.status, response.read()
        connection.close()
        return result

    def test_explicit_routes_never_fall_back_to_filesystem(self):
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        self.assertEqual(self.request("GET", "/healthz")[0], 200)
        for path in ("/server.py", "/../server.py", "/../../etc/passwd", "/%2e%2e/server.py"):
            self.assertEqual(self.request("GET", path)[0], 404)

    def test_echo_is_bounded_and_does_not_execute_input(self):
        status, body = self.request("POST", "/echo", "<script>untrusted</script>")
        self.assertEqual(status, 200)
        self.assertIn(b'"received"', body)
        self.assertEqual(self.request("POST", "/echo", "x" * (MAX_BODY + 1))[0], 413)

    def test_requests_are_not_written_to_access_logs(self):
        output = io.StringIO()
        with contextlib.redirect_stderr(output):
            self.request("GET", "/healthz?secret=query-sentinel")
            self.request("POST", "/echo", "body-sentinel")
        self.assertNotIn("sentinel", output.getvalue())


if __name__ == "__main__":
    unittest.main()
