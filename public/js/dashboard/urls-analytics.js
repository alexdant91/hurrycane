const url_id = $('#url_id').val();
const $startDate = $('#start-date');
const $endDate = $('#end-date');
let myChartDevice, myChartLocation, myChartReferer;
$.ajax({
    url: '/dashboard/urls/analytics',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    dataType: 'json',
    data: JSON.stringify({
        url_id,
        startDate: Math.round(new Date(new Date().toDateInputValueYesterday()).getTime() / 1000),
        endDate: Math.round(new Date(new Date().toDateInputValue()).getTime() / 1000)
    }),
    success: function (data) {
        if (data.Error) {
            iziToast.error({
                position: 'topRight',
                title: data.title,
                message: data.text
            });
        } else if (data.Status == 'done') {

            let ctxDevice = document.getElementById("device").getContext('2d');
            myChartDevice = new Chart(ctxDevice, {
                type: 'doughnut',
                data: {
                    labels: data.devices.labels,
                    datasets: [{
                        data: data.devices.data,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(54, 162, 235, 1)'
                        ],
                        // borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    }
                }
            });

            let locationLabelsFormatted = [];
            data.locations.labels.forEach(item => {
                locationLabelsFormatted.push(item.split('_')[0].toUpperCase());
            });
            let ctxLocation = document.getElementById("location").getContext('2d');
            myChartLocation = new Chart(ctxLocation, {
                type: 'bar',
                data: {
                    labels: locationLabelsFormatted,
                    datasets: [{
                        label: '# Clicks',
                        data: data.locations.data,
                        backgroundColor: 'rgba(54, 162, 235, 0.55)',
                        // borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    }
                }
            });

            let refererLabelsFormatted = [];
            data.referer.labels.forEach(item => {
                refererLabelsFormatted.push(extractHostname(item).hostname);
            });
            let ctxReferer = document.getElementById("referer").getContext('2d');
            myChartReferer = new Chart(ctxReferer, {
                type: 'line',
                data: {
                    labels: refererLabelsFormatted,
                    datasets: [{
                        label: '# Clicks',
                        data: data.referer.data,
                        backgroundColor: 'rgba(54, 162, 235, 0.35)',
                        // borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    }
                }
            });

        }
    },
    error: function (a, b, c) {
        console.log(a, b, c);
    }
});

$(document).on('click', '.update-date', function () {
    const startDate = Math.round(new Date($startDate.val()) / 1000);
    const endDate = Math.round(new Date($endDate.val()) / 1000);

    $.ajax({
        url: '/dashboard/urls/analytics',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            url_id,
            startDate,
            endDate
        }),
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: data.title,
                    message: data.text
                });
            } else if (data.Status == 'done') {

                let ctxDevice = document.getElementById("device").getContext('2d');
                myChartDevice = new Chart(ctxDevice, {
                    type: 'doughnut',
                    data: {
                        labels: data.devices.labels,
                        datasets: [{
                            data: data.devices.data,
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(54, 162, 235, 0.6)',
                                'rgba(54, 162, 235, 1)'
                            ],
                            // borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true
                                }
                            }]
                        }
                    }
                });

                let locationLabelsFormatted = [];
                data.locations.labels.forEach(item => {
                    locationLabelsFormatted.push(item.split('_')[0].toUpperCase());
                });
                let ctxLocation = document.getElementById("location").getContext('2d');
                myChartLocation = new Chart(ctxLocation, {
                    type: 'bar',
                    data: {
                        labels: locationLabelsFormatted,
                        datasets: [{
                            label: '# Clicks',
                            data: data.locations.data,
                            backgroundColor: 'rgba(54, 162, 235, 0.55)',
                            // borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true
                                }
                            }]
                        }
                    }
                });

                let refererLabelsFormatted = [];
                data.referer.labels.forEach(item => {
                    refererLabelsFormatted.push(extractHostname(item));
                });
                let ctxReferer = document.getElementById("referer").getContext('2d');
                myChartReferer = new Chart(ctxReferer, {
                    type: 'line',
                    data: {
                        labels: refererLabelsFormatted,
                        datasets: [{
                            label: '# Clicks',
                            data: data.referer.data,
                            backgroundColor: 'rgba(54, 162, 235, 0.35)',
                            // borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            yAxes: [{
                                ticks: {
                                    beginAtZero: true
                                }
                            }]
                        }
                    }
                });

            }
        },
        error: function (a, b, c) {
            console.log(a, b, c);
        }
    });

    myChartReferer.data.labels = ['Tablet', 'Desktop', 'Phone', 'Unknown'];
    myChartReferer.data.datasets[0].data = [23, 32, 64, 29];
    myChartReferer.update();
});

function extractHostname(url) {
    let hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    } else {
        hostname = url.split('/')[0];
    }
    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];
    protocol = url.split('/')[0].replace(":", "");

    return {
        hostname,
        protocol
    };
}