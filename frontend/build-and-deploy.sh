#!/bin/bash

# ApexBox Companion - Build and Deploy Script
# This script helps automate the build and deployment process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if EAS CLI is installed
check_eas_cli() {
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI not found!"
        print_info "Install it with: npm install -g eas-cli"
        exit 1
    fi
    print_success "EAS CLI is installed"
}

# Check if logged into Expo
check_eas_login() {
    if ! eas whoami &> /dev/null; then
        print_warning "Not logged into Expo"
        print_info "Running: eas login"
        eas login
    else
        print_success "Logged into Expo as: $(eas whoami)"
    fi
}

# Check app.json configuration
check_app_config() {
    print_header "Checking app.json Configuration"
    
    if [ ! -f "app.json" ]; then
        print_error "app.json not found!"
        exit 1
    fi
    
    # Extract version info
    VERSION=$(grep -o '"version": "[^"]*"' app.json | cut -d'"' -f4)
    print_info "App Version: $VERSION"
    
    print_success "app.json looks good"
}

# Main menu
show_menu() {
    clear
    print_header "ApexBox Companion - Build & Deploy"
    
    echo "What would you like to do?"
    echo ""
    echo "1) Configure EAS (First time setup)"
    echo "2) Build for iOS (Production)"
    echo "3) Build for Android (Production)"
    echo "4) Build for Both Platforms"
    echo "5) Build Preview (APK for testing)"
    echo "6) Submit to iOS App Store"
    echo "7) Submit to Google Play Store"
    echo "8) Submit to Both Stores"
    echo "9) View Build Status"
    echo "10) Exit"
    echo ""
    read -p "Enter your choice [1-10]: " choice
    
    case $choice in
        1) configure_eas ;;
        2) build_ios ;;
        3) build_android ;;
        4) build_both ;;
        5) build_preview ;;
        6) submit_ios ;;
        7) submit_android ;;
        8) submit_both ;;
        9) view_builds ;;
        10) exit 0 ;;
        *) 
            print_error "Invalid choice"
            sleep 2
            show_menu
            ;;
    esac
}

# Configure EAS
configure_eas() {
    print_header "Configuring EAS Build"
    
    check_eas_cli
    check_eas_login
    
    print_info "Running: eas build:configure"
    eas build:configure
    
    print_success "EAS configuration complete!"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Build iOS
build_ios() {
    print_header "Building for iOS (Production)"
    
    check_eas_cli
    check_eas_login
    check_app_config
    
    print_warning "This will start a cloud build. It may take 15-30 minutes."
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Build cancelled"
        sleep 2
        show_menu
        return
    fi
    
    print_info "Starting iOS build..."
    eas build --platform ios --profile production
    
    print_success "iOS build initiated!"
    print_info "Check status with: eas build:list"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Build Android
build_android() {
    print_header "Building for Android (Production)"
    
    check_eas_cli
    check_eas_login
    check_app_config
    
    print_warning "This will start a cloud build. It may take 15-30 minutes."
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Build cancelled"
        sleep 2
        show_menu
        return
    fi
    
    print_info "Starting Android build..."
    eas build --platform android --profile production
    
    print_success "Android build initiated!"
    print_info "Check status with: eas build:list"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Build both platforms
build_both() {
    print_header "Building for iOS & Android (Production)"
    
    check_eas_cli
    check_eas_login
    check_app_config
    
    print_warning "This will start cloud builds for both platforms."
    print_warning "Total time: ~30-60 minutes"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Build cancelled"
        sleep 2
        show_menu
        return
    fi
    
    print_info "Starting builds for both platforms..."
    eas build --platform all --profile production
    
    print_success "Builds initiated for both platforms!"
    print_info "Check status with: eas build:list"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Build preview APK
build_preview() {
    print_header "Building Preview APK for Android"
    
    check_eas_cli
    check_eas_login
    
    print_info "Building APK for testing..."
    eas build --platform android --profile preview
    
    print_success "Preview APK build initiated!"
    print_info "You can install this APK directly on Android devices"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Submit to iOS
submit_ios() {
    print_header "Submitting to iOS App Store"
    
    check_eas_cli
    check_eas_login
    
    print_warning "Make sure you have a successful iOS build first!"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Submission cancelled"
        sleep 2
        show_menu
        return
    fi
    
    print_info "Submitting to App Store..."
    eas submit --platform ios
    
    print_success "iOS submission complete!"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Submit to Android
submit_android() {
    print_header "Submitting to Google Play Store"
    
    check_eas_cli
    check_eas_login
    
    print_warning "Make sure you have a successful Android build first!"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Submission cancelled"
        sleep 2
        show_menu
        return
    fi
    
    print_info "Submitting to Play Store..."
    eas submit --platform android
    
    print_success "Android submission complete!"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Submit to both stores
submit_both() {
    print_header "Submitting to Both App Stores"
    
    print_info "This will submit to both iOS and Android stores"
    print_warning "Make sure you have successful builds for both platforms!"
    read -p "Continue? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Submission cancelled"
        sleep 2
        show_menu
        return
    fi
    
    print_info "Submitting to iOS App Store..."
    eas submit --platform ios
    
    print_info "Submitting to Google Play Store..."
    eas submit --platform android
    
    print_success "Submissions complete for both platforms!"
    
    read -p "Press Enter to continue..."
    show_menu
}

# View build status
view_builds() {
    print_header "Recent Builds"
    
    check_eas_cli
    check_eas_login
    
    eas build:list
    
    print_info "View full details at: https://expo.dev/"
    
    read -p "Press Enter to continue..."
    show_menu
}

# Main execution
main() {
    # Change to frontend directory
    cd "$(dirname "$0")"
    
    # Show menu
    show_menu
}

# Run main function
main
