from rest_framework.test import APITestCase


class Beat22ReferenceTests(APITestCase):
    def test_summary_endpoint(self):
        response = self.client.get("/api/v1/reference/beat22/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("roles", response.data)
        self.assertGreaterEqual(response.data["totals"]["screens"], 2)

    def test_image_endpoint(self):
        summary = self.client.get("/api/v1/reference/beat22/")
        first_artist = summary.data["roles"]["artist"]["screens"][0]
        image_url = first_artist["image_url"]
        response = self.client.get(image_url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("image/"))
