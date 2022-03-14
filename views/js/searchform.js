document.querySelector('#Dog').addEventListener('click', async eve => {
    document.querySelector('#Dog>a').classList.add('active');
    document.querySelector('#Cat>a').classList.remove('active');
    document.querySelector('#Other>a').classList.remove('active');
    clearSessionStorage();
    sessionStorage.setItem('petCategoryName', 'species');
    sessionStorage.setItem('petCategoryValue', 'Dog');
    await retrieveFromPetsCache({isInitCall: true});
});

document.querySelector('#Cat').addEventListener('click', async eve => {
    document.querySelector('#Cat>a').classList.add('active');
    document.querySelector('#Dog>a').classList.remove('active');
    document.querySelector('#Other>a').classList.remove('active');
    clearSessionStorage();
    sessionStorage.setItem('petCategoryName', 'species');
    sessionStorage.setItem('petCategoryValue', 'Cat');
    await retrieveFromPetsCache({isInitCall: true}); 
});

document.querySelector('#Other').addEventListener('click', async eve => {
    document.querySelector('#Other>a').classList.add('active');
    document.querySelector('#Dog>a').classList.remove('active');
    document.querySelector('#Cat>a').classList.remove('active');
    clearSessionStorage();
    sessionStorage.setItem('petCategoryName', 'type');
    sessionStorage.setItem('petCategoryValue', 'Other');
    await retrieveFromPetsCache({isInitCall: true});
});

function clearSessionStorage(){
    [
        'petCategoryName',
        'petCategoryValue',
        'cursor',
        'pets',
        'filters',
        'filterEntries',
        'optionsNameHTMLID',
        'optionNameMappingDS2Display',
        'optionNameMappingDisplay2DS'
    ].forEach(cacheName => sessionStorage.removeItem(cacheName));
}

function queryPets({petCategoryName, petCategoryValue, cursor, isFilterEntriesNeeded, filterString}) {
    let batchAmount = 30;
    let url = `https://paws-furever.wl.r.appspot.com/pets?${petCategoryName}=${petCategoryValue}&limit=${batchAmount}`;
    if (cursor) {
        url = `${url}&cursor=${cursor}`;
    }
    if (isFilterEntriesNeeded) {
        const filterNames = 'Gender|Breed|Size|Location_State|Age_Range|Availability';
        url = `${url}&filterNames=${filterNames}`;
    }

    if(filterString) {
        url = `${url}&filters=${filterString}`;
    }

    return fetch(url).then(response => response.json());
}

async function retrieveFromPetsCache({isInitCall}) {
    let petsDisplayCount = 9;
    let petCategoryName = sessionStorage.getItem('petCategoryName');
    let petCategoryValue = sessionStorage.getItem('petCategoryValue');
    let cursor = sessionStorage.getItem('cursor');
    let filters = JSON.parse(sessionStorage.getItem('filters'));

    let queryPetsResult;
    let petsCache;
    if (isInitCall) {
        queryPetsResult = await queryPets({petCategoryName: petCategoryName, petCategoryValue:petCategoryValue, isFilterEntriesNeeded: true});

        sessionStorage.setItem('optionsNameHTMLID', JSON.stringify(
            [
                { optionName: 'Breed', selectionID: 'breed-selection' },
                { optionName: 'Availability', selectionID: 'availability-selection' },
                { optionName: 'Age_Range', selectionID: 'age-selection' },
                { optionName: 'Gender', selectionID: 'gender-selection' },
                { optionName: 'Size', selectionID: 'size-selection' }, 
                { optionName: 'Location_State', selectionID: 'state-selection' }                      
            ]
        ));
        sessionStorage.setItem('optionNameMappingDS2Display', JSON.stringify({
            'Age_Range': 'Age Range',
            'Location_State': 'Location State'
        }));
        sessionStorage.setItem('optionNameMappingDisplay2DS', JSON.stringify({
            'Age Range': 'Age_Range',
            'Location State': 'Location_State'
        }));
        // console.dir(queryPetsResult);
        sessionStorage.setItem('filterEntries', JSON.stringify(queryPetsResult.filterEntries));
        sessionStorage.setItem('pets', JSON.stringify(queryPetsResult.items));
        sessionStorage.setItem('cursor', queryPetsResult.cursor);
        petsCache = queryPetsResult.items;

    } else {
        petsCache = JSON.parse(sessionStorage.getItem('pets'));
        // note: cache may get cleared once users select filter values
        petsCache = petsCache ?? [];
        if (petsCache.length <= petsDisplayCount) {
            let filtersStr = '';
            for (p in filters){
                filtersStr = `${filtersStr}|${p}:${filters[p]}`;
            }
            filtersStr = filtersStr.substring(1);
            queryPetsResult = await queryPets({petCategoryName:petCategoryName, petCategoryValue:petCategoryValue, cursor:cursor, filterString:filtersStr});
            petsCache.push(...queryPetsResult.items);
            sessionStorage.setItem('cursor', queryPetsResult.cursor);
        }
    }

    let galleryPets = petsCache.splice(0, petsDisplayCount);
    sessionStorage.setItem('pets', JSON.stringify(petsCache));
    let hasMorePets = true;

    if (petsCache.length == 0) {
        hasMorePets = false;
    }
    let galleryPetsInfo = {
        items: galleryPets,
        hasMorePets: hasMorePets
    }
    createGallery(galleryPetsInfo);
    populateFilterOptions();
    attachFilterApplyHandler();

    if (hasMorePets) {
        attachSeeMoreHandler(petCategoryName, petCategoryValue);
    }
}

function attachSeeMoreHandler(petCategoryName, petCategoryValue) {
    document.querySelector('#see-more').addEventListener('click', (eve) => {
        let cursor = sessionStorage.getItem('cursor');
        retrieveFromPetsCache({ petCategoryName: petCategoryName, petCategoryValue: petCategoryValue, cursor: cursor, isInitCall: false });

    });
}

function populateFilterOptions() {
    let optionsNameHTMLID = JSON.parse(sessionStorage.getItem('optionsNameHTMLID'));
    optionsNameHTMLID.forEach(option=>{
        populateFilterOption(option.optionName, option.selectionID);
    });
}

function populateFilterOption(optionName, selectionID) {
    let filterEntries = JSON.parse(sessionStorage.getItem('filterEntries'));
    let options = filterEntries[optionName];
    
    let optionsString;
    let filters= JSON.parse(sessionStorage.getItem('filters'));

    let optionNameMappingDS2Display = JSON.parse(sessionStorage.getItem('optionNameMappingDS2Display'));
    let optionDisplayName = optionName in optionNameMappingDS2Display ? optionNameMappingDS2Display[optionName] : optionName;
    let optionsStringFirstOption = `<option selected>${optionDisplayName}</option>`;

    options.forEach(option => {
        if (filters && optionName in filters && option == filters[optionName]){
            optionsStringFirstOption = `<option>${optionDisplayName}</option><option selected>${filters[optionName]}</option>`
        } else {
            optionsString = `${optionsString}<option value="${option}">${option}</option>`;
        }
    });
    optionsString = `${optionsStringFirstOption}${optionsString}`;
    document.querySelector(`#${selectionID}`).innerHTML = optionsString;
}

function attachFilterApplyHandler(){
    document.querySelector('#filter-update').addEventListener('click', () => {
        // since the filter condition changes, the current cache and cursor become invalid 
        sessionStorage.removeItem('pets');
        sessionStorage.removeItem('cursor');
        let optionsNameHTMLID = JSON.parse(sessionStorage.getItem('optionsNameHTMLID'));
        applyFilterOption(optionsNameHTMLID);
    });
}

function applyFilterOption(optionsNameHTMLID){
    let optionNameMappingDisplay2DS = JSON.parse(sessionStorage.getItem('optionNameMappingDisplay2DS'));
    let filters = {};
    optionsNameHTMLID.forEach(optionNameIDPair=>{
        let optionValue = document.querySelector(`#${optionNameIDPair.selectionID}`).value;
        optionValue = optionValue in optionNameMappingDisplay2DS ? optionNameMappingDisplay2DS[optionValue] : optionValue;

        //Handles for when user selects non-default option in drop down menu
        if(optionValue != optionNameIDPair.optionName){
            filters[optionNameIDPair.optionName] = optionValue;
        }
    });
    sessionStorage.setItem('filters', JSON.stringify(filters));
    retrieveFromPetsCache({isInitCall: false});
}

function createGallery(petsInfo) {
    let galleryHTML = [];
    galleryHTML.push(`
        <div class="container-md mt-3">
            <div class="row row-cols-2 row-cols-md-3 g-4">
                <div class="col">
                    <select class="form-select" id="breed-selection"></select>
                </div>
                <div class="col">
                    <select class="form-select" id="availability-selection"></select>
                </div>
                <div class="col">
                    <select class="form-select" id="age-selection"></select>
                </div>
                <div class="col">
                    <select class="form-select" id="gender-selection"></select>
                </div>
                <div class="col">
                    <select class="form-select" id="size-selection"></select>
                </div>
                <div class="col">
                    <select class="form-select" id="state-selection"></select>
                </div>
                <div class="col-12">
                    <button type="button" class="btn btn-primary" id="filter-update">Apply Filters</button> 
                </div>`);
    const pets = petsInfo.items;
    pets.forEach(pet => {
        galleryHTML.push(`
        <div class="col-12 col-md-6 col-lg-4 d-flex justify-content-center">
            <div class="card h-100 text-center" style="width: 20rem;">
                <img src="${pet['Picture1_URL_Primary']}" class="card-img-top" alt="${pet['Name']}">
                <div class="card-body">
                    <h5 class="card-title">${pet['Name']}</h5>
                    <p class="card-text">${pet['Description']}</p>
                    <a class="btn btn-primary" href="/petProfile?petId=${pet['id']}">View</a>
                </div>
            </div>
        </div>`);
    });
    galleryHTML.push('</div>');
    if (petsInfo.hasMorePets) {
        galleryHTML.push(`
        <br>
        <div class="row text-center">
            
            <!-- <input type="hidden" id="cursor" value="${petsInfo['cursor']}"> -->
            <div class="col">
                <button id="see-more" class="btn btn-primary">See More Profiles</button>
            </div>
        </div>
        <br>`
        );
    }


    galleryHTML.push('<br></div>');
    document.querySelector('#Gallery').innerHTML = galleryHTML.join('');
}