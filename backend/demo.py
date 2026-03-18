"""
Demo Flow Script for IntelliMobility AI
Run this script to auto-trigger a sequence of events for presentation purposes.
"""
import httpx
import time
import sys

BASE_URL = "http://localhost:8000"

def print_step(msg):
    print(f"\n[DEMO] {msg}")
    time.sleep(1.5)

def run_demo():
    print("=== IntelliMobility AI Demo Sequence ===")
    
    with httpx.Client(timeout=30) as client:
        # Step 1: Trigger Highway Fatigue
        print_step("1. Triggering Highway Fatigue Detection (F1)...")
        try:
            r = client.post(f"{BASE_URL}/api/highway/simulate", json={"type": "FATIGUE"})
            print(f"  Response: {r.status_code}")
        except Exception as e:
            print(f"  Error: {e}")
            
        time.sleep(4)
        
        # Step 2: Trigger Highway Crash
        print_step("2. Triggering Highway Crash Detection (F1)...")
        try:
            r = client.post(f"{BASE_URL}/api/highway/simulate", json={"type": "CRASH"})
            print(f"  Response: {r.status_code}")
        except Exception as e:
            print(f"  Error: {e}")
            
        time.sleep(4)
        
        # Step 3: Trigger Mobile SOS
        print_step("3. Simulating Mobile App SOS Trigger (F4)...")
        try:
            r = client.post(f"{BASE_URL}/api/emergency/sos", json={
                "user_id": "DEMO_USER_999",
                "lat": 13.0418,
                "lng": 80.2341,
                "description": "Heart attack, need immediate assistance at T Nagar",
                "severity": "CRITICAL"
            })
            print(f"  Response: {r.status_code}")
        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(5)
        
        # Step 4: Trigger Green Corridor
        print_step("4. Activating Green Corridor for Ambulance (F2)...")
        try:
            # Assuming Hospital ID 1 is Apollo Hospitals Greams Road
            r = client.post(f"{BASE_URL}/api/emergency/green-corridor", json={
                "ambulance_lat": 13.0418,
                "ambulance_lng": 80.2341,
                "hospital_lat": 13.0633,
                "hospital_lng": 80.2505
            })
            print(f"  Response: {r.status_code}")
        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(4)
        
        # Step 5: Test Narrator
        print_step("5. Triggering AI Safety Narrator (F6)...")
        try:
            r = client.post(f"{BASE_URL}/api/narrator/broadcast-test")
            print(f"  Response: {r.status_code}")
        except Exception as e:
            print(f"  Error: {e}")
            
    print("\n=== Demo Sequence Complete ===")

if __name__ == "__main__":
    run_demo()
