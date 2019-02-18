(function () {
  "use strict";

  var elements = stripe.elements({
    // Stripe's examples are localized to specific languages, but if
    // you wish to have Elements automatically detect your user's locale,
    // use `locale: 'auto'` instead.
    locale: window.__exampleLocale
  });

  /**
   * Card Element
   */
  var card = elements.create("card", {
    iconStyle: "solid",
    style: {
      base: {
        iconColor: "#8ba0b4",
        color: "#2b3440",
        fontWeight: 400,
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        fontSize: "16px",
        fontSmoothing: "antialiased",

        "::placeholder": {
          color: "#8ba0b4"
        },
        ":-webkit-autofill": {
          color: "#2b3440"
        }
      },
      invalid: {
        iconColor: "#8ba0b4",
        color: "#2b3440"
      }
    }
  });
  card.mount("#example5-card");

  /**
   * Payment Request Element
   */
  var paymentRequest = stripe.paymentRequest({
    country: "IT",
    currency: "eur",
    total: {
      amount: 0,
      label: "Total"
    }
  });
  paymentRequest.on("token", function (result) {
    // var example = document.querySelector(".example5");
    // example.querySelector(".token").innerText = result.token.id;
    // example.classList.add("submitted");
    // result.complete("success");
    // We have the token to send
    // $.ajax({
    //   url: '/upgrade/premium',
    //   method: 'POST',
    //   data: {
    //     token_id: result.token.id
    //   },
    //   success: function (data) {
    //     console.log(data);
    //     if (data.Error) {
    //       iziToast.error({
    //         position: 'topRight',
    //         title: 'Oops!',
    //         message: data.Error
    //       });
    //     }
    //     if (data.Status === 'done') {
    //       location.href = '/dashboard?new=1&p=premium';
    //     }
    //   },
    //   error: function (a, b, c) {
    //     console.log(a, b, c);
    //   }
    // });
  });

  var paymentRequestElement = elements.create("paymentRequestButton", {
    paymentRequest: paymentRequest,
    style: {
      paymentRequestButton: {
        theme: "light"
      }
    }
  });

  paymentRequest.canMakePayment().then(function (result) {
    if (result) {
      document.querySelector(".example5 .card-only").style.display = "none";
      document.querySelector(
          ".example5 .payment-request-available"
        ).style.display =
        "block";
      paymentRequestElement.mount("#example5-paymentRequest");
    }
  });

  registerElements([card], "example5");
})();