import json
import re
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server_defaults import build_minimal_config


def assert_clean_new_tab(testcase, config):
    testcase.assertEqual(config["branding"], {"title": "WarTab", "icon": "sword"})
    testcase.assertFalse(config["statusBar"]["enabled"])
    testcase.assertEqual(config["statusBar"]["glancesUrl"], "")
    testcase.assertFalse(config["statusBar"]["hostname"])
    testcase.assertNotIn("cards", config)
    testcase.assertEqual(config["pageOrder"], ["page-new-tab"])
    testcase.assertEqual(config["currentPage"], "page-new-tab")
    testcase.assertEqual(
        config["pages"],
        {"page-new-tab": {"name": "New Tab", "icon": "layout", "cards": []}},
    )


class CleanDistributionTests(unittest.TestCase):
    def test_server_first_run_is_an_empty_new_tab(self):
        assert_clean_new_tab(self, build_minimal_config("test-version"))

    def test_example_config_is_an_empty_new_tab(self):
        config = json.loads((ROOT / "config.example.json").read_text(encoding="utf-8"))
        assert_clean_new_tab(self, config)

    def test_extension_default_is_an_empty_new_tab(self):
        source = (ROOT / "app.js").read_text(encoding="utf-8")
        default_block = source.split("const DEFAULT_CONFIG =", 1)[1].split(
            "SECTION 4: ICON DATA", 1
        )[0]
        self.assertRegex(default_block, r"cards:\s*\[\s*\]")
        self.assertNotIn("welcome-card", default_block)
        self.assertNotIn("homeassistant.local", default_block)
        self.assertRegex(default_block, r"enabled:\s*false")
        self.assertRegex(default_block, r"glancesUrl:\s*''")

    def test_empty_dashboard_is_preserved_during_initialization(self):
        source = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertNotIn("Config had no cards — restored defaults", source)
        self.assertNotRegex(source, r"if\s*\(\s*!config\.cards\s*\|\|")

    def test_tracked_distribution_has_no_private_instance_data(self):
        tracked = subprocess.check_output(
            ["git", "ls-files"], cwd=ROOT, text=True
        ).splitlines()
        runtime_files = [
            item for item in tracked
            if item == "config.json" or item.startswith(("notes/", "uploads/", "snapshots/"))
        ]
        self.assertEqual(runtime_files, [])

        public_surfaces = {
            "README.md",
            "config.example.json",
            "server_defaults.py",
            "server_network.py",
            "app.js",
            "modules/digital-pet.js",
            "ctl.sh",
            "setup.sh",
            ".deploy/deploy.sh",
        }
        private_instance_network = (
            r"\b" + re.escape(".".join(("10", "0", "0"))) + r"\.\d{1,3}\b"
        )
        private_instance = re.compile(
            private_instance_network
            + r"|/home/[A-Za-z0-9._-]+|https?://tab\.[^\s\"']+",
            re.IGNORECASE,
        )
        findings = []
        for relative in sorted(public_surfaces.intersection(tracked)):
            text = (ROOT / relative).read_text(encoding="utf-8")
            if private_instance.search(text):
                findings.append(relative)
        self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()
