// * Variables
const L = window.L;

const wrapperEl = document.querySelector('.wrapper');
const searchAreaEl = document.querySelector('search-area');
const mapEl = document.querySelector('#map');
const summaryAreaEl = document.querySelector('.summary-area');
const summaryEl = document.querySelector('#summary');
const scoresAreaEl = document.querySelector('.scores-container');
const scoresEl = document.querySelector('.scores');
const scoreHeaderEl = document.querySelector('.score-header');
const findBtn = document.querySelector('#find-btn');
const totalEl = document.querySelector('#total-score');
const cityEl = document.querySelector('#city-name');
const openModalButton = document.querySelector('[data-modal-target]');
const closeModalButton = document.querySelector('[data-close-button]');
const overlay = document.getElementById('overlay');
const modalBody = document.querySelector('.modal-body');
const modalErrEl = document.querySelector('.modal-error');
const remoteBtn = document.querySelector('#cbx');
const faMapMarker = document.querySelector('#fa-map-marker');

let currentCoords;
let currentCity;
let ipLoaded = false;
let eventLoaded = false;
let remoteList = [];
let listings = [];

let map = L.map('map', {
    center: [0, 0],
    zoom: 8,
    zoomControl: false,
    doubleClickZoom: false
}).setView([0, 0], 8);
// console.log(L);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

//initial marker
let marker = L.marker([0, 0], {
    draggable: true,
    title: 'Current Search Area',
    autoPan: true
}).addTo(map);



// * Functions
function ClearChildren(el) {
    while (el.children.length > 0) {
        el.removeChild(el.children[0]);
    }
}
function ClearEl(el, str) {
    el.innerHTML = str || '';
}

function openModal(modal) {
    if (modal == null) return;
    modal.classList.add('active');
    for (let el of document.querySelectorAll('.wrapper *')) {
        el.classList.add('hidden');
    }
    overlay.classList.add('active');
}

function closeModal(modal) {
    if (modal == null) return;
    modal.classList.remove('active');
    overlay.classList.remove('active');
    setTimeout(_ => {
        for (let el of document.querySelectorAll('.wrapper *')) {
            el.classList.remove('hidden');
        }
    }, 300);
}

function AddClick(el, url) {
    el.addEventListener('click', e => {
        e.preventDefault();
        window.open(url, '_blank');
    });
    // console.log("click added");
}

function DisplayMap(latLng) {
    map.setView(latLng, 8);
    marker.setLatLng(latLng);
    return map;
}

function ShowScores(scoreArray, total) {
    ClearChildren(scoresEl);
    totalEl.innerText = `${total.toFixed(2)}`;

    for (let score of scoreArray) {
        let scoreEl = document.createElement('div');
        scoreEl.classList.add('score');
        scoreEl.classList.add(score.name.replace(/ .*/, ''));
        scoreEl.innerHTML = `<h3> ${score.name} <span class="score"> ${score.score_out_of_10.toFixed(1)} </span></h3>`;

        let fullBar = document.createElement('div');
        fullBar.classList.add('full-bar');

        let partBar = document.createElement('div');
        partBar.classList.add('partial-bar');

        scoresEl.appendChild(scoreEl);
        scoreEl.appendChild(fullBar);
        fullBar.appendChild(partBar);
        setTimeout(_ => {
            partBar.style.width = `${score.score_out_of_10 * 10}%`;
        }, 50);
    }
}

function ShowSummaryError() {
    ClearChildren(summaryEl);
    ClearChildren(scoresEl);
    ClearEl(cityEl);
    ClearEl(totalEl, '<span class="red">n/a</span>');
    currentCity = null;
    summaryEl.innerHTML = `<span class="red">No results in this area.</span><span>Click below to view remote job listings.</span>`;
    scoresEl.innerHTML = `
            <h3 class="red">No scores for this area.</h3>
    `;
}

function ShowJobsError() {
    ClearChildren(modalBody);
    remoteBtn.checked = false;
    remoteBtn.classList.remove('active');
    modalErrEl.innerHTML = `<h3>There are no listings right now. Check back later or click above to view remote listings.</h3>`;
}

function AddListings(list) {
    ClearChildren(modalBody);
    for (let listing of list) {
        let keywords = listing.keywords;
        let logo = listing.logo;
        let text = listing.text;
        let url = listing.url;
        let listingEl = document.createElement('div');

        listingEl.classList.add('listing');
        listingEl.innerHTML = `
            <h3 class="role">${listing.role || ''}</h3>
            <h4 class="company-name">${listing.company_name || ''}</h4>
            <object class="logo" data="${logo}" type="image/jpeg"><i class="fa fa-terminal faa-passing faa-slow animated" aria-hidden="true"></i></object>
            <article class="desc">${text || ''}</article>
            <h6 class="location">${listing.location || ''}</h6>
            <h6 class="employment-type">${listing.employment_type || ''}</h6>
            <div class="keywords"></div>
        `;
        for (let keyword of keywords) {
            listingEl.querySelector('.keywords').innerHTML += `<div class="keyword">${keyword}</div>`;
        }
        modalBody.appendChild(listingEl);
        AddClick(listingEl, url);
    }
}

function AddRemote(list) {
    for (let listing of list) {
        let keywords = listing.keywords;
        let logo = listing.logo;
        let text = listing.text;
        let url = listing.url;
        let listingEl = document.createElement('div');

        listingEl.classList.add('listing');
        listingEl.innerHTML = `
            <h3 class="role">${listing.role || ''}</h3>
            <h4 class="company-name">${listing.company_name || ''}</h4>
            <object class="logo" data="${logo}" type="image/jpeg"><i class="fa fa-terminal faa-passing faa-slow animated" aria-hidden="true"></i></object>
            <article class="desc">${text || ''}</article>
            <h6 class="location remote">Remote</h6>
            <h6 class="employment-type">${listing.employment_type || ''}</h6>
            <div class="keywords"></div>
        `;
        for (let keyword of keywords) {
            listingEl.querySelector('.keywords').innerHTML += `<div class="keyword">${keyword}</div>`;
        }
        modalBody.appendChild(listingEl);
        AddClick(listingEl, url);
    }
}

function UpdateList() {
    if (!remoteBtn.classList.contains('active')) {
        ClearEl(modalErrEl);
        AddRemote(remoteList);
        modalBody.classList.remove('hidden');
        remoteBtn.classList.add('active');
    } else {
        AddListings(listings);
        modalBody.classList.remove('hidden');
        remoteBtn.classList.remove('active');
    }
    if (!remoteBtn.checked && listings.length == 0) {
        ShowJobsError();
        modalBody.classList.add('hidden');
    }
    if (currentCity == null) remoteBtn
}

async function GetData() {
    const nyc = {
        city: 'New York',
        latitude: 40.7127,
        longitude: -74.0059
    };
    if (!ipLoaded) {
        marker.setLatLng([nyc.latitude, nyc.longitude]);
        currentCoords = {
            lat: marker.getLatLng().lat,
            lng: marker.getLatLng().lng
        };
        currentCity = nyc.city;
    }
    ipLoaded = true;


    // Teleport api calls
    let qolRes1 = await fetch(`https://api.teleport.org/api/locations/${currentCoords.lat},${currentCoords.lng}`);
    qolRes1 = await qolRes1.json();
    if (qolRes1['_embedded']['location:nearest-urban-areas'].length > 0) {
        let url = qolRes1['_embedded']['location:nearest-urban-areas'][0]['_links']['location:nearest-urban-area'].href;
        qolRes1 = await fetch(url);
        qolRes1 = await qolRes1.json();
        let uaId = qolRes1.ua_id;

        currentCity = qolRes1.name;
        cityEl.innerText = currentCity;

        let qolRes2 = await fetch(`https://api.teleport.org/api/urban_areas/teleport:${uaId}/scores/`);
        qolRes2 = await qolRes2.json();
        let categories = qolRes2.categories;
        categories.splice(4, 1);
        let summary = qolRes2.summary;
        summaryEl.innerHTML = summary;
        if (summaryEl.querySelectorAll('p').length > 1) {
            summaryEl.removeChild(summaryEl.querySelector('p:last-child'));
        }
        ShowScores(categories, qolRes2.teleport_city_score);
    } else {
        ShowSummaryError();
    }

    // Findwork api call
    fwRes = await fetch(`http://findwork.dev/jobs/?location=${currentCity}`, {
        method: "GET",
        headers: {
            "Authorization": "Token d954c3c2ec05bfaaefc4a2ba4681d08737622666"
        }
    });
    fwRes = await fwRes.json();
    listings = fwRes.results;

    fwRes = await fetch(`http://findwork.dev/jobs/?location=&remote=true&search=javascript&employment_type=full+time&order_by=relevance`, {
        method: "GET",
        headers: {
            "Authorization": "Token d954c3c2ec05bfaaefc4a2ba4681d08737622666"
        }
    });
    fwRes = await fwRes.json();
    remoteList = fwRes.results;

    if (listings.length == 0 && !remoteBtn.checked) {
        ShowJobsError();
        modalBody.classList.add('hidden');
    } else if (listings.length == 0 && remoteBtn.checked) {
        ClearEl(modalErrEl);
        ClearChildren(modalBody);
        AddRemote(remoteList);
        modalBody.classList.remove('hidden');
    } else {
        ClearEl(modalErrEl);
        AddListings(listings);
        modalBody.classList.remove('hidden');
    }

    if (remoteBtn.checked && remoteBtn.classList.contains('active') && listings.length != 0 && currentCity != null) {
        remoteBtn.checked = false;
        remoteBtn.classList.remove('active')
    }

    remoteBtn.addEventListener('click', UpdateList);

    setTimeout(_ => {
        DisplayMap(marker.getLatLng());
    }, 200);
}

// *Events
window.addEventListener("DOMContentLoaded", _ => {

    // modal
    openModalButton.addEventListener('click', _ => {
        const modal = document.querySelector(openModalButton.dataset.modalTarget);
        setTimeout(_ => {
            openModal(modal);
        }, 220);
    });

    closeModalButton.addEventListener('click', _ => {
        const modal = closeModalButton.closest('.modal');
        closeModal(modal);
    });

    overlay.addEventListener('click', _ => {
        const modal = document.querySelector('.modal.active');
        closeModal(modal);
    });

    map.on('dblclick', e => {
        summaryEl.classList.add('flash');
        scoresAreaEl.classList.add('flash');
        totalEl.classList.add('flash');
        cityEl.classList.add('flash');

        GetData();
        // move marker
        marker.setLatLng(e.latlng);
        currentCoords = marker.getLatLng();
        cityEl.innerText = currentCity;

        setTimeout(_ => {
            summaryEl.classList.remove('flash');
            scoresAreaEl.classList.remove('flash');
            totalEl.classList.remove('flash');
            cityEl.classList.remove('flash');
        }, 600);
    });

    marker.on('dragend', e => {
        summaryEl.classList.add('flash');
        scoresAreaEl.classList.add('flash');
        totalEl.classList.add('flash');
        cityEl.classList.add('flash');

        GetData();
        marker.setLatLng([e.target._latlng.lat, e.target._latlng.lng]);
        currentCoords = marker.getLatLng();
        cityEl.innerText = currentCity;

        setTimeout(_ => {
            summaryEl.classList.remove('flash');
            scoresAreaEl.classList.remove('flash');
            totalEl.classList.remove('flash');
            cityEl.classList.remove('flash');
        }, 600);
    });

    findBtn.addEventListener('mouseover', _ => {
        faMapMarker.classList.add('animated');
    });

    findBtn.addEventListener('mouseout', _ => {
        faMapMarker.classList.remove('animated');
    });

    findBtn.addEventListener('click', _ => {
        GetData();
        console.log(currentCity);
        if (listings.length == 0 && currentCity == null) {
            remoteBtn.click();
        }
        setTimeout(_ => {
            modalBody.scroll({ top: 0, behavior: 'smooth' });
        }, 500);

    });

    GetData();
});