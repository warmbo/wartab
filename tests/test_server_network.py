"""Focused tests for WarTab's extracted network helpers."""

import io
import json
import subprocess
import unittest
import urllib.error
from email.message import Message
from unittest import mock

import server_network


class TestNetworkParameterValidation(unittest.TestCase):
    def test_ping_parameters_require_host_and_cap_count(self):
        self.assertEqual(
            server_network.validate_ping_params({"host": "router.lan", "count": "99"}),
            ("router.lan", 10),
        )
        with self.assertRaisesRegex(ValueError, "missing host"):
            server_network.validate_ping_params({})
        with self.assertRaisesRegex(ValueError, "invalid count"):
            server_network.validate_ping_params({"host": "router.lan", "count": "many"})

    def test_certificate_parameters_validate_port(self):
        self.assertEqual(
            server_network.validate_cert_params({"host": "example.com"}),
            ("example.com", 443),
        )
        for port in ("nope", "0", "65536"):
            with self.subTest(port=port):
                with self.assertRaisesRegex(ValueError, "invalid port"):
                    server_network.validate_cert_params({"host": "example.com", "port": port})

    def test_proxy_parameters_reject_invalid_protocol_and_cap_timeout(self):
        request = server_network.validate_proxy_request({
            "url": "https://example.com/api",
            "method": "post",
            "timeout": 100,
        })
        self.assertEqual(request["method"], "POST")
        self.assertEqual(request["timeout"], server_network.PROXY_TIMEOUT)
        with self.assertRaisesRegex(ValueError, "invalid protocol"):
            server_network.validate_proxy_request({"url": "file:///etc/passwd"})


class TestNetworkOperations(unittest.TestCase):
    @mock.patch("server_network.get_local_ips", return_value=["192.168.50.25"])
    @mock.patch("server_network.subprocess.run")
    @mock.patch("builtins.open", new_callable=mock.mock_open,
                read_data="IP address       HW type     Flags       HW address            Mask     Device\n")
    def test_arp_refresh_uses_detected_local_subnet(self, _open, run, _local_ips):
        server_network._refresh_arp_cache()

        targets = [call.args[0][-1] for call in run.call_args_list]
        self.assertIn("192.168.50.1", targets)
        self.assertNotIn(".".join(("10", "0", "0", "1")), targets)

    @mock.patch("server_network.urllib.request.urlopen")
    def test_proxy_caps_http_error_response_body(self, urlopen):
        upstream = io.BytesIO(b"x" * (server_network.PROXY_MAX_RESPONSE + 100))
        urlopen.side_effect = urllib.error.HTTPError(
            "https://example.com", 500, "failure", Message(), upstream,
        )

        result, status = server_network.handle_proxy({"url": "https://example.com"})

        self.assertEqual(status, 502)
        self.assertEqual(len(result["body"]), server_network.PROXY_MAX_RESPONSE)

    @mock.patch("server_network.subprocess.run")
    def test_ping_parses_standard_summary(self, run):
        run.return_value = mock.Mock(
            returncode=0,
            stdout="rtt min/avg/max/mdev = 1.100/2.200/3.300/0.400 ms\n",
            stderr="",
        )
        result, status = server_network.handle_ping({"host": "router.lan", "count": "2"})
        self.assertEqual(status, 200)
        self.assertEqual(result, {
            "host": "router.lan", "alive": True, "min_ms": 1.1,
            "avg_ms": 2.2, "max_ms": 3.3, "mdev_ms": 0.4, "packets": 2,
        })
        run.assert_called_once_with(
            ["ping", "-c", "2", "-W", "3", "router.lan"],
            capture_output=True, text=True, timeout=15,
        )

    @mock.patch("server_network.subprocess.run", side_effect=subprocess.TimeoutExpired("ping", 15))
    def test_ping_timeout_retains_response_shape(self, _run):
        self.assertEqual(
            server_network.handle_ping({"host": "router.lan"}),
            ({"host": "router.lan", "alive": False, "error": "timeout"}, 200),
        )

    @mock.patch("server_network.os.path.exists", return_value=True)
    @mock.patch("server_network.urllib.request.urlopen")
    def test_docker_status_summarizes_daemon_response(self, urlopen, _exists):
        response = mock.MagicMock()
        response.read.return_value = json.dumps([
            {"Id": "abcdef1234567890", "Names": ["/web"], "Image": "nginx",
             "State": "running", "Status": "Up", "Ports": [], "Created": 1},
            {"Id": "1234567890abcdef", "Names": [], "Image": "job",
             "State": "exited", "Status": "Exited", "Ports": [], "Created": 2},
        ]).encode()
        urlopen.return_value.__enter__.return_value = response

        result, status = server_network.handle_docker()

        self.assertEqual(status, 200)
        self.assertEqual((result["total"], result["running"], result["stopped"]), (2, 1, 1))
        self.assertEqual(result["containers"][0]["name"], "web")


if __name__ == "__main__":
    unittest.main()
