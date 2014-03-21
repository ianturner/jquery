// ********************************************************************************
// ContactMessageForm.ascx
// ASP.Net MVC3 (NVelocity) view excerpt demonstrating AtD usage
// 3rd April 2012
// Ian Turner (https://github.com/ianturner)
// see https://groups.google.com/forum/?hl=en#!forum/atd-developers
// ********************************************************************************

<div class="message-text">
    <!-- the reply text -->
    <%: Html.StyledLabelFor(model => model.MessageText)%>
    <div class="spelling-check-button ui-pg-div">
        <span class="ui-icon ui-icon-check" style="display: inline-block;"></span>
        <span id="btnCreateMessageCheckSpelling" class="btnCheckSpelling">Check Spelling</span>
    </div>
    <textarea name="MessageText" id="MessageText" class="new-message" rows="5" cols="88"></textarea>
    <%: Html.ValidationMessageFor(model => model.MessageText) %>
</div>


<script type="text/javascript" language="javascript">
function interceptAtDCallbacks(id, callbacks) {
    $.AtD.check(id,
                {
                    ready: callbacks.ready,
                    explain: callbacks.explain,
                    success: function (errorCount) {
                        if (errorCount == 0) {
                            ShowMessage("The message contains no spelling errors");
                        }

                        $("#" + id).unspellcheck();
                        $("#" + $.AtD.restoreId(id)).trigger("keyup");
                    },
                    error: callbacks.error,
                    editSelection: callbacks.editSelection
                });
                
    $(document).ready(function () {
        $("#ContactMessageForm").find(".btnCheckSpelling").click(function (evt) {
            evt.stopPropagation();

            // if the button is enabled, check spelling
            if (!$(evt.target).closest(".ui-pg-button").hasClass("ui-state-disabled")) {
                // hit session timer
                sessionTimeout.Reset();

                if ($(evt.target).text() == "Check Spelling") {
                    DisableButton($("#btnCreateNewMessage"));

                    // run AtD to spell-check the clicked "MessageText" textarea's input text
                    $("#MessageText").spellcheck($(evt.target).attr("id"), '<strong>Done</strong>', interceptAtDCallbacks);
                }
                else {
                    // interceptAtDCallbacks only called when the spell check affirms no spelling errors
                    // interceptAtDCallbacks forces a keyup on the textarea to re-validate
                    // BUT, none of this would be done if the user clicked "Done" before fixing all errors
                    // ... so we need to do that here
                    $("#MessageText").unspellcheck();
                    $("#MessageText").trigger("keyup");
                }
            }

            return false;
        });
    });
</script>
