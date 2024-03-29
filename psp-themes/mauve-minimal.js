// ***********************************************************************
// This script can be used to easily make common changes to a Chargify PSP
// To get started, review and edit the values in the config section below
// Made by Luke
// ***********************************************************************

// CONFIG ================================================================

const sendLogMessages = false;        // If enabled, log messages will be sent to the console for debug purposes

// Theme options
const darkMode = false;               // Toggles dark mode color adjustments.
const layout = "minimal";             // Accepted values: "default" and "minimal". More layouts WIP.
let accentColor = "#5b2a3d";                 // Primary accent color. Must be a valid hex code with leading '#'
let hoverColor = "#4caacc";                  // Secondary color used when hovering/clicking buttons. Defaults to accent color.
let backgroundColor = "#d1adcb";             // Override theme background color. Leave blank for default.
const googleFontName = "Lexend";            // Must be a valid Google font family url name (fonts.google.com). Will use default if left blank

// Mark items as required
const requireOrg = false;             // Make customer organization a required field
const requirePhone = false;           // Make customer phone number a required field and accept values that include 10+ digits
const requiredCustomFields = [];      // Set type ("customer" or "subscription") and "id" for each. Example: [{"type":"subscription", "id","12345"}]

// Hide items
const hideRecurringFee = false;       // Hide recurring fee from Plan Summary section
const hideComponentFee = false;       // Hide component fee from Plan Summary section
const hidePhone = false;              // Hide customer phone number field
const hideOrg = false;                // Hide customer organization field
const hideHeader = false;             // Hide the page header/logo
const hiddenCustomFieldIDs = [];      // Set type ("customer" or "subscription") and ID for each. Example: [{"type":"subscription", "id","12345"}]
const removeNoneOption = false;       // If enabled, remove the default "None" option from all dropdown custom fields

// Find/replace text on the page 
const textToReplace = [];             // Separate original/new text with a pipe ('|'). Example: ["Customer Information|Account Info"]

// END CONFIG ============================================================

$(function () {
    function sendLog(text) {
        if (sendLogMessages) { console.log(text); }
    }

    // Set accent color
    if (accentColor.length >= 1) {
        sendLog('injecting CSS for accent colors');
        if (hoverColor.length <= 1) { hoverColor = accentColor }
        $("<style>")
            .prop("type", "text/css")
            .html(`\
                #subscription_submit, #form__section-apply-components, .form__button--primary, .btn-success {\
                    border: solid 2px ${accentColor};\
                    background-color: ${accentColor};\
                    color: '#FFF';\
                }\
                #form__section-apply-components:hover, #subscription_submit:hover, .form__button--is-submitting, .form__button--primary:hover, .form__button--primary:active, .form__button--primary:focus, .form__button--primary:disabled, .btn-success:hover {\
                    background-color: ${hoverColor};\
                    border: solid 2px ${hoverColor};\
                    color: '#FFF';\
                    background-image: none;\
                }\
                .plan__summary-total {\
                    color: ${accentColor};\
                }\
                .content__heading--mobile .content__heading-section--total {\
                    color: #ffffff;\
                }\
                `
            )
            .appendTo("head");
    }

    // Apply Google font
    if (googleFontName.length > 0) {
        sendLog(`applying google font '${googleFontName}'`)
        $('head').append(`<link href="https://fonts.googleapis.com/css?family=${googleFontName}" rel="stylesheet" type="text/css">`);
        $('body').css('font-family', `${googleFontName}, sans-serif`);
    } else { sendLog('skipping google font, no name provided'); }

    // Hide items
    if (hidePhone) { sendLog('hiding phone #'); $('.form__field--phone').hide(); }
    if (hideOrg) { sendLog('hiding organization'); $('.form__field--organization-name').hide(); }
    if (hideHeader) { sendLog('hiding page header'); $('.header').remove(); }
    if (removeNoneOption) { sendLog('hiding "None" option from Dropdowns'); $('.form__field-custom-field select option[value=""]').remove(); }
    for (const field of hiddenCustomFieldIDs) {
        sendLog(`hiding ${field.type} custom field ${field.id}`);
        $(`#subscription_${field.type == 'customer' ? 'customer_attributes_' : ''}metafields_${field.id}`).parents('.form__field-custom-field').hide();
    }
    function hideRecurringFeeFn() { sendLog('hiding recurring fee in summary'); $('#summary-recurring-charges').hide(); }
    if (hideRecurringFee) { hideRecurringFeeFn; $(document).bind("afterSummaryRefresh", hideRecurringFeeFn); }
    function hideComponentFeeFn() { sendLog('hiding component fees in summary'); $('.plan__summary-component').hide(); }
    if (hideComponentFee) { hideComponentFeeFn; $(document).bind("afterSummaryRefresh", hideComponentFeeFn); }

    // Find and replace text
    for (const pair of textToReplace) {
        const ogText = pair.split('|')[0];
        const newText = pair.split('|')[1];
        sendLog(`replacing "${ogText}" with "${newText}"`);
        $(`:contains("${ogText}")`)
            .filter('h1,h2,h3,button,label')
            .text(`${newText}`);
    }

    // Require Organization
    const orgfield = $("#subscription_customer_attributes_organization");
    if (requireOrg) {
        const orgfieldLabel = $('label[for="subscription_customer_attributes_organization"]');
        orgfieldLabel.text(orgfieldLabel.text() + " *");
        orgfield.blur(function () {
            if ($(this).val() !== "") {
                $(this).parent().removeClass("has-error");
                orgfield.siblings('span').remove();
            } else {
                $(this).parent().addClass("has-error");
            }
        });
    }

    // Require phone number
    const phone = $("#subscription_customer_attributes_phone");
    if (requirePhone) {
        const phoneLabel = $('label[for="subscription_customer_attributes_phone"]');
        phoneLabel.text(phoneLabel.text() + " *");
        $(phone).blur(function () {
            if ($(this).val() !== "" && phone.val().match(/(\d+)/gm).join('').length >= 10) {
                $(this).parent().removeClass("has-error");
            } else {
                $(this).parent().addClass("has-error");
            }
        });
    }

    // Require customer custom fields
    for (const field of requiredCustomFields) {
        const customField = $(`#subscription_${field.type == 'customer' ? 'customer_attributes_' : ''}metafields_${field.id}`);
        const fieldLabel = $(`label[for="subscription_${field.type == 'customer' ? 'customer_attributes_' : ''}metafields_${field.id}"]`);
        fieldLabel.text(fieldLabel.text() + " *");
        customField.blur(function () {
            if ($(this).val() !== "") {
                $(this).parent().removeClass("has-error");
                $(this).siblings('span').remove();
            } else {
                $(this).parent().addClass("has-error");
            }
        });
    }

    // Submit button validations
    const submitBtn = $("#subscription_submit");
    submitBtn.click(function () {
        if (requireOrg) {
            if (orgfield.val() === "") {
                orgfield.parent().addClass('has-error');
                if (orgfield.siblings('span').length == 0) { orgfield.parent().append('<span class="error-message">Cannot be blank</span>') }
                return false;
            }
        }

        if (requirePhone) {
            if (phone.val() === "" || phone.val().match(/(\d+)/gm).join('').length < 10) {
                phone.addClass("has-error");
                return false;
            }
        }

        for (const field of requiredCustomFields) {
            const customField = $(`#subscription_${field.type == 'customer' ? 'customer_attributes_' : ''}metafields_${field.id}`);
            if (customField.val() === "") {
                customField.parent().addClass("has-error");
                if (customField.siblings('span').length == 0) { customField.parent().append('<span style="color: red;" class="error-message">Cannot be blank</span>') }
                return false;
            }
        }
    });

    // Form change validations
    const form = $("#signup-form");
    form.change(function () {
        if (requireOrg) {
            if (orgfield.val() != "") {
                // orgfield.parent().removeClass('has-error');
                submitBtn.click(function () {
                    return true;
                });
            }
        }

        if (requirePhone) {
            form.change(function () {
                if (phone.val() != "" && phone.val().match(/(\d+)/gm).join('').length >= 10) {
                    submitbtn.click(function () {
                        return true;
                    });
                }
            });
        }

        for (const field of requiredCustomFields) {
            const customField = $(`#subscription_${field.type == 'customer' ? 'customer_attributes_' : ''}metafields_${field.id}`);
            if (customField.val() != "") {
                submitBtn.click(function () {
                    return true;
                });
            }
        }
    });

    // Apply themes
    let textColor = darkMode ? '#f9f9f9' : '#000000';
    let borderColor = darkMode ? '#ffffff30' : '#00000030';
    switch (layout) {
        case 'minimal':
            if (backgroundColor.length <= 1) { backgroundColor = darkMode ? '#363c49' : '#ffffff'; }
            let minimalTheme = `\
            body {\
                background-color: ${backgroundColor};\
                color: ${textColor};\
                font-size: 16px;\
                padding: 0px 15px;\
            }\
            .content,\
            .content__main,\
            .content__secondary {\
                background: ${backgroundColor};\
                border: 0px;\
            }\
            .content__main {\
                border-right: 1px solid ${borderColor} !important;\
            }\
            .content__headings {\
                border: 0px solid #000;\
            }\
            .content__heading,\
            .form__section-heading {\
                background: ${backgroundColor};\
                color: ${textColor};\
                border-bottom: 1px solid ${borderColor};\
                padding: 20px;\
            }\
            .content__heading--mobile {\
                background: ${backgroundColor};\
                border: 1px solid ${borderColor};\
            }\
            .form__section--boxed {\
                border: 0px solid ${borderColor};\
                border-radius: 4px;\
            }\
            .form__field--boxed {\
                border: 1px solid ${borderColor};\
            }\
            .form__section--boxed header {\
                background: ${backgroundColor};\
                border-bottom: 1px solid ${borderColor};\
                border-top-left-radius: 6px;\
                border-top-right-radius: 6px;\
                margin: 0;\
                padding: 10px;\
            }\
            .form__section--billing-address .form__field-radio-group .radio > .form__fields {\
                margin: 10px 0px;\
            }\
            .form__section--billing-address .form__field-radio-group .radio > .form__field {\
                margin: 20px 10px 0px 10px;\
            }\
            .form__field-radio-group {\
                border: 1px solid ${borderColor};\
            }\
            .form__field-radio-group .radio header {\
                background: ${backgroundColor};\
                color: ${textColor};\
            }\
            .form__field-radio-group .radio:not(:last-child) header {\
                border-bottom: 1px solid ${borderColor};\
            }\
            h1,\
            h2 {\
                font-size: 18px;\
                color: ${textColor};\
                margin: 0;\
                font-weight: 500;\
            }\
            h3 {\
                padding-left: 0px !important;\
            }\
             \
            .plan__summary-total {\
                font-size: 18px;\
                color: ${textColor};\
                border-top: 1px solid ${borderColor};\
            }\
            `;
            $("<style>").prop("type", "text/css").html(minimalTheme).appendTo("head");
            break;
        case 'default':
            if (backgroundColor.length <= 1) { backgroundColor = darkMode ? '#181e23' : '#f9f9f9'; }
            let defaultTheme = darkMode ? `\
                body {\
                    background-color: ${backgroundColor};\
                }\
                .header, .header h1, .footer__operated-by-link, .footer__privacy-policy-link, h2, h3, h4 {\
                    color: #f9f9f9\
                }\
                .content, .content__main, .form__field-radio-group {\
                    background-color: #232a31;\
                    color: #f9f9f9;\
                    border: 0px solid ${borderColor};\
                }\
                .content__headings,\
                .content__heading--mobile,\
                .form__section--credit-card header,\
                .form__section--configure-plan .form__field--boxed,\
                .form__section--billing-address .form__field-radio-group .radio header {\
                    background: #38434f;\
                    border: 1px solid ${borderColor}\
                }\
                .form__section--boxed header {\
                    border: 0px;\
                    border-bottom: 1px solid ${borderColor};\
                    border-top-left-radius: 4px;\
                    border-top-right-radius: 4px;\
                }\
                .content__heading {\
                    background: #38434f;\
                    border-bottom: 0px solid ${borderColor};\
                }\
                .form__field-radio-group .radio:not(:last-child) header {\
                    border-bottom: 1px solid ${borderColor}\
                }\
                .form__section--credit-card {\
                    border: 1px solid ${borderColor}\
                }\
                .content__main {\
                    border-right: 1px solid ${borderColor}\
                }\
                ` : `body {background-color: ${backgroundColor};}`;
            $("<style>").prop("type", "text/css").html(defaultTheme).appendTo("head");
            break;
    }
});
