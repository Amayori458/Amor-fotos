#!/usr/bin/env python3

import requests
import sys
import json
import io
from datetime import datetime
from pathlib import Path

class PhotoKioskAPITester:
    def __init__(self, base_url="https://photo-kiosk-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None
        self.order_number = None
        self.photo_ids = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}"
        headers = {}
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=60)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                print(f"   Status: {response.status_code} ✅")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return self.log_test(name, True), response_data
                except:
                    return self.log_test(name, True), {}
            else:
                print(f"   Status: {response.status_code} (expected {expected_status}) ❌")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return self.log_test(name, False, f"Status {response.status_code}"), {}

        except Exception as e:
            print(f"   Exception: {str(e)} ❌")
            return self.log_test(name, False, str(e)), {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET", 
            "",
            200
        )
        return success

    def test_settings_get(self):
        """Test get settings"""
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200
        )
        if success and response:
            required_fields = ['store_name', 'currency', 'price_per_photo', 'receipt_footer']
            missing = [f for f in required_fields if f not in response]
            if missing:
                return self.log_test("Settings Fields Check", False, f"Missing fields: {missing}")
            else:
                print(f"   Settings: {response.get('store_name')} - {response.get('currency')} {response.get('price_per_photo')}")
        return success

    def test_settings_update(self):
        """Test update settings"""
        test_data = {
            "store_name": "Test Photo Store",
            "currency": "BRL", 
            "price_per_photo": 3.00,
            "receipt_footer": "Test footer message"
        }
        
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "settings", 
            200,
            data=test_data
        )
        
        if success and response:
            # Verify the update worked
            for key, value in test_data.items():
                if response.get(key) != value:
                    return self.log_test("Settings Update Verification", False, f"{key} not updated correctly")
            print("   Settings updated successfully")
        return success

    def test_create_session(self):
        """Test session creation"""
        success, response = self.run_test(
            "Create Session",
            "POST",
            "sessions",
            200
        )
        
        if success and response:
            required_fields = ['session_id', 'upload_path', 'expires_at', 'created_at']
            missing = [f for f in required_fields if f not in response]
            if missing:
                return self.log_test("Session Fields Check", False, f"Missing fields: {missing}")
            
            self.session_id = response.get('session_id')
            print(f"   Session ID: {self.session_id}")
            print(f"   Upload Path: {response.get('upload_path')}")
            
        return success

    def test_get_session(self):
        """Test get session details"""
        if not self.session_id:
            return self.log_test("Get Session", False, "No session_id available")
            
        success, response = self.run_test(
            "Get Session",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        
        if success and response:
            required_fields = ['session_id', 'status', 'created_at', 'expires_at', 'photos_count', 'photos']
            missing = [f for f in required_fields if f not in response]
            if missing:
                return self.log_test("Session Details Check", False, f"Missing fields: {missing}")
            
            print(f"   Status: {response.get('status')}")
            print(f"   Photos count: {response.get('photos_count')}")
            
        return success

    def test_upload_photos(self):
        """Test photo upload"""
        if not self.session_id:
            return self.log_test("Upload Photos", False, "No session_id available")
        
        # Create test image files
        test_files = []
        for i in range(2):
            # Create a simple test image (1x1 pixel PNG)
            png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
            test_files.append(('files', (f'test_photo_{i+1}.png', io.BytesIO(png_data), 'image/png')))
        
        success, response = self.run_test(
            "Upload Photos",
            "POST",
            f"sessions/{self.session_id}/photos",
            200,
            files=test_files
        )
        
        if success and response:
            if isinstance(response, list) and len(response) > 0:
                self.photo_ids = [photo.get('photo_id') for photo in response]
                print(f"   Uploaded {len(response)} photos")
                print(f"   Photo IDs: {self.photo_ids}")
                
                # Check photo structure
                photo = response[0]
                required_fields = ['photo_id', 'session_id', 'file_key', 'file_name', 'mime_type', 'size_bytes', 'url_path']
                missing = [f for f in required_fields if f not in photo]
                if missing:
                    return self.log_test("Photo Fields Check", False, f"Missing fields: {missing}")
            else:
                return self.log_test("Upload Response Check", False, "Expected list of photos")
                
        return success

    def test_list_session_photos(self):
        """Test list session photos"""
        if not self.session_id:
            return self.log_test("List Session Photos", False, "No session_id available")
            
        success, response = self.run_test(
            "List Session Photos",
            "GET",
            f"sessions/{self.session_id}/photos",
            200
        )
        
        if success and response:
            if isinstance(response, list):
                print(f"   Found {len(response)} photos in session")
            else:
                return self.log_test("Photos List Check", False, "Expected list of photos")
                
        return success

    def test_get_upload_file(self):
        """Test file serving"""
        if not self.photo_ids:
            return self.log_test("Get Upload File", False, "No photo_ids available")
        
        # Get the first photo to test file serving
        success, photos = self.run_test(
            "Get Session for File Test",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        
        if not success or not photos.get('photos'):
            return self.log_test("Get Upload File", False, "No photos available for file test")
        
        photo = photos['photos'][0]
        file_key = photo.get('file_key')
        
        if not file_key:
            return self.log_test("Get Upload File", False, "No file_key available")
        
        # Test file serving endpoint
        url = f"{self.api_base}/uploads/{file_key}"
        print(f"\n🔍 Testing Get Upload File...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url, timeout=30)
            success = response.status_code == 200
            
            if success:
                print(f"   Status: {response.status_code} ✅")
                print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
                print(f"   Content-Length: {len(response.content)} bytes")
                return self.log_test("Get Upload File", True)
            else:
                print(f"   Status: {response.status_code} ❌")
                return self.log_test("Get Upload File", False, f"Status {response.status_code}")
                
        except Exception as e:
            print(f"   Exception: {str(e)} ❌")
            return self.log_test("Get Upload File", False, str(e))

    def test_create_order(self):
        """Test order creation"""
        if not self.session_id:
            return self.log_test("Create Order", False, "No session_id available")
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            f"sessions/{self.session_id}/orders",
            200,
            data={"selected_photo_ids": None}  # All photos
        )
        
        if success and response:
            required_fields = ['order_number', 'session_id', 'photo_count', 'currency', 'price_per_photo', 'total_amount', 'store_name', 'status', 'photos']
            missing = [f for f in required_fields if f not in response]
            if missing:
                return self.log_test("Order Fields Check", False, f"Missing fields: {missing}")
            
            self.order_number = response.get('order_number')
            print(f"   Order Number: {self.order_number}")
            print(f"   Photo Count: {response.get('photo_count')}")
            print(f"   Total Amount: {response.get('total_amount')} {response.get('currency')}")
            
        return success

    def test_get_order(self):
        """Test get order details"""
        if not self.order_number:
            return self.log_test("Get Order", False, "No order_number available")
            
        success, response = self.run_test(
            "Get Order",
            "GET",
            f"orders/{self.order_number}",
            200
        )
        
        if success and response:
            print(f"   Order Status: {response.get('status')}")
            print(f"   Photos in Order: {len(response.get('photos', []))}")
            
        return success

    def test_mark_order_printed(self):
        """Test mark order as printed"""
        if not self.order_number:
            return self.log_test("Mark Order Printed", False, "No order_number available")
            
        success, response = self.run_test(
            "Mark Order Printed",
            "POST",
            f"orders/{self.order_number}/mark-printed",
            200
        )
        
        if success and response:
            if response.get('status') == 'printed':
                print(f"   Order marked as printed successfully")
                print(f"   Printed at: {response.get('printed_at')}")
            else:
                return self.log_test("Order Status Check", False, f"Expected status 'printed', got '{response.get('status')}'")
                
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Photo Kiosk API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_settings_get,
            self.test_settings_update,
            self.test_create_session,
            self.test_get_session,
            self.test_upload_photos,
            self.test_list_session_photos,
            self.test_get_upload_file,
            self.test_create_order,
            self.test_get_order,
            self.test_mark_order_printed,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = PhotoKioskAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())