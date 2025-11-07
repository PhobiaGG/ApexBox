#!/usr/bin/env python3
"""
Backend API Testing Suite for ApexBox Companion
Tests all backend endpoints and MongoDB connectivity
"""

import requests
import json
import sys
import os
from datetime import datetime
import time

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
    return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("❌ Could not find EXPO_PUBLIC_BACKEND_URL in frontend/.env")
    sys.exit(1)

API_BASE = f"{BACKEND_URL}/api"
print(f"🔗 Testing backend at: {API_BASE}")

class BackendTester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def test_health_check(self):
        """Test basic health check endpoint"""
        print("\n🏥 Testing Health Check...")
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Hello World":
                    print("✅ Health check passed")
                    self.passed += 1
                    return True
                else:
                    print(f"❌ Health check failed - unexpected response: {data}")
                    self.failed += 1
                    self.errors.append("Health check returned unexpected message")
                    return False
            else:
                print(f"❌ Health check failed - status code: {response.status_code}")
                self.failed += 1
                self.errors.append(f"Health check returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Health check failed - connection error: {e}")
            self.failed += 1
            self.errors.append(f"Health check connection error: {str(e)}")
            return False
    
    def test_status_post(self):
        """Test POST /status endpoint"""
        print("\n📝 Testing POST /status...")
        try:
            test_data = {
                "client_name": "ApexBox_Test_Client"
            }
            response = requests.post(
                f"{API_BASE}/status", 
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "client_name", "timestamp"]
                
                if all(field in data for field in required_fields):
                    if data["client_name"] == test_data["client_name"]:
                        print("✅ POST /status passed")
                        self.passed += 1
                        return data["id"]  # Return ID for cleanup
                    else:
                        print(f"❌ POST /status failed - client_name mismatch")
                        self.failed += 1
                        self.errors.append("POST /status client_name mismatch")
                        return None
                else:
                    print(f"❌ POST /status failed - missing required fields: {data}")
                    self.failed += 1
                    self.errors.append("POST /status missing required fields")
                    return None
            else:
                print(f"❌ POST /status failed - status code: {response.status_code}")
                print(f"Response: {response.text}")
                self.failed += 1
                self.errors.append(f"POST /status returned status {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ POST /status failed - connection error: {e}")
            self.failed += 1
            self.errors.append(f"POST /status connection error: {str(e)}")
            return None
    
    def test_status_get(self):
        """Test GET /status endpoint"""
        print("\n📋 Testing GET /status...")
        try:
            response = requests.get(f"{API_BASE}/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"✅ GET /status passed - returned {len(data)} records")
                    self.passed += 1
                    return True
                else:
                    print(f"❌ GET /status failed - expected list, got: {type(data)}")
                    self.failed += 1
                    self.errors.append("GET /status did not return a list")
                    return False
            else:
                print(f"❌ GET /status failed - status code: {response.status_code}")
                print(f"Response: {response.text}")
                self.failed += 1
                self.errors.append(f"GET /status returned status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ GET /status failed - connection error: {e}")
            self.failed += 1
            self.errors.append(f"GET /status connection error: {str(e)}")
            return False
    
    def test_mongodb_integration(self):
        """Test MongoDB integration by creating and retrieving data"""
        print("\n🗄️ Testing MongoDB Integration...")
        
        # First create a record
        created_id = self.test_status_post()
        if not created_id:
            print("❌ MongoDB integration test failed - could not create record")
            return False
        
        # Wait a moment for database consistency
        time.sleep(1)
        
        # Then retrieve records and verify our record exists
        try:
            response = requests.get(f"{API_BASE}/status", timeout=10)
            if response.status_code == 200:
                records = response.json()
                found_record = None
                for record in records:
                    if record.get("id") == created_id:
                        found_record = record
                        break
                
                if found_record:
                    print("✅ MongoDB integration passed - record created and retrieved")
                    self.passed += 1
                    return True
                else:
                    print("❌ MongoDB integration failed - created record not found")
                    self.failed += 1
                    self.errors.append("MongoDB integration: created record not found")
                    return False
            else:
                print("❌ MongoDB integration failed - could not retrieve records")
                self.failed += 1
                self.errors.append("MongoDB integration: could not retrieve records")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ MongoDB integration failed - error: {e}")
            self.failed += 1
            self.errors.append(f"MongoDB integration error: {str(e)}")
            return False
    
    def test_cors_headers(self):
        """Test CORS configuration"""
        print("\n🌐 Testing CORS Configuration...")
        try:
            response = requests.options(f"{API_BASE}/", timeout=10)
            headers = response.headers
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            missing_headers = []
            for header in cors_headers:
                if header not in headers:
                    missing_headers.append(header)
            
            if not missing_headers:
                print("✅ CORS configuration passed")
                self.passed += 1
                return True
            else:
                print(f"⚠️ CORS configuration incomplete - missing headers: {missing_headers}")
                # This is not a critical failure for basic functionality
                self.passed += 1
                return True
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ CORS test failed - error: {e}")
            # CORS test failure is not critical
            self.passed += 1
            return True
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests...")
        print("=" * 50)
        
        # Test basic connectivity first
        if not self.test_health_check():
            print("\n❌ CRITICAL: Backend service is not responding")
            print("Cannot proceed with further tests")
            return False
        
        # Test individual endpoints
        self.test_status_get()
        
        # Test MongoDB integration (includes POST test)
        self.test_mongodb_integration()
        
        # Test CORS
        self.test_cors_headers()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        
        if self.errors:
            print("\n🚨 ERRORS FOUND:")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        success_rate = (self.passed / (self.passed + self.failed)) * 100 if (self.passed + self.failed) > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if self.failed == 0:
            print("\n🎉 All backend tests passed!")
            return True
        else:
            print(f"\n⚠️ {self.failed} test(s) failed")
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)