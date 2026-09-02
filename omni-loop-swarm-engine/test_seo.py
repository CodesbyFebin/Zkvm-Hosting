import json
import re
import unittest

import seo

TEMPLATE = """<!doctype html>
<html>
<head>
<!-- SSR:HEAD:START -->
<title>default</title>
<!-- SSR:HEAD:END -->
</head>
<body>
<!-- SSR:NOSCRIPT:START -->
<noscript>default</noscript>
<!-- SSR:NOSCRIPT:END -->
<div id="root"></div>
</body>
</html>
"""


class TestRenderIndex(unittest.TestCase):
    def test_root_route_gets_home_meta(self):
        html = seo.render_index(TEMPLATE, "/")
        self.assertIn("<title>Omni-Loop Swarm Engine</title>", html)
        self.assertIn('href="https://swarm.zkvm.host/"', html)

    def test_docs_route_gets_distinct_meta(self):
        html = seo.render_index(TEMPLATE, "/docs")
        self.assertIn("API Reference", html)
        self.assertIn('href="https://swarm.zkvm.host/docs"', html)
        # /docs's title legitimately ends with the product name (branding),
        # so check it isn't the *home* page's exact title, not just that
        # the product name is absent.
        self.assertNotIn("<title>Omni-Loop Swarm Engine</title>", html)

    def test_unknown_route_falls_back_to_home(self):
        html = seo.render_index(TEMPLATE, "/does-not-exist")
        self.assertIn("<title>Omni-Loop Swarm Engine</title>", html)

    def test_jsonld_is_valid_json_and_route_specific(self):
        home = seo.render_index(TEMPLATE, "/")
        docs = seo.render_index(TEMPLATE, "/docs")

        home_match = re.search(r"application/ld\+json\">\s*(\{.*?\})\s*</script>", home, re.DOTALL)
        docs_match = re.search(r"application/ld\+json\">\s*(\{.*?\})\s*</script>", docs, re.DOTALL)

        home_data = json.loads(home_match.group(1))
        docs_data = json.loads(docs_match.group(1))

        self.assertEqual(home_data["@type"], "SoftwareApplication")
        self.assertEqual(docs_data["@type"], "TechArticle")
        self.assertNotEqual(home_data["url"], docs_data["url"])

    def test_noscript_block_is_route_specific(self):
        home = seo.render_index(TEMPLATE, "/")
        docs = seo.render_index(TEMPLATE, "/docs")
        self.assertIn("Single mode", home)
        self.assertIn("api/jobs", docs)
        self.assertNotIn("<noscript>default</noscript>", home)
        self.assertNotIn("<noscript>default</noscript>", docs)

    def test_markers_are_fully_replaced_not_duplicated(self):
        html = seo.render_index(TEMPLATE, "/")
        self.assertEqual(html.count("SSR:HEAD:START"), 1)
        self.assertEqual(html.count("SSR:NOSCRIPT:START"), 1)


if __name__ == "__main__":
    unittest.main()
