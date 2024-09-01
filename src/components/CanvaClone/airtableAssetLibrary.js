import Airtable from 'airtable';

// This custom asset library demonstrates how to use an arbitrary API as an asset source.
// Airtable is a SaaS product that provides extensible spreadsheets.
// We use their javascript library https://github.com/Airtable/airtable.js
// to query a sample spreadsheet and display the images in the spreadsheet
// in our asset library.

// Insert a readonly API key:
// See: https://support.airtable.com/hc/en-us/articles/360056249614-Creating-a-read-only-API-key
let AIRTABLE_API_KEY = 'patoA6UnGRmiO8eOx.5b3c180901fe1d3b6d7c7b8867a4a4b52d1e8398e8b6520dbda1933155c54a7a';

let base;
if (AIRTABLE_API_KEY !== '') {
  base = new Airtable({
    apiKey: AIRTABLE_API_KEY
  }).base('appHAZoD6Qj3teOmr'); // Ensure base is being called correctly as a method
}

export const queryAirtable = ({ query, page, perPage }) => {
  let records = [];
  return new Promise(function (resolve, reject) {
    if (!base) {
      reject(new Error('Airtable base is not initialized'));
      return;
    }

    base('Asset sources')
      .select({
        maxRecords: perPage || 100,
        view: 'Grid view',
        // Poor man’s search via Airtable formula
        filterByFormula: query
          ? "AND({Name} != '', SEARCH(LOWER('" + query + "'), LOWER({Name})))"
          : "{Name} != ''"
      })
      .eachPage(
        function page(pageRecords, fetchNextPage) {
          pageRecords.forEach(function (record) {
            const asset = {
              name: record.get('Name'),
              image: record.get('Image')[0]
            };
            records = [...records, asset];
          });
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            console.error(err);
            reject(err); // Reject the promise on error
            return;
          }
          resolve({ results: records });
        }
      );
  });
};

export const findAirtableAssets = async (type, queryData) => {
  if (AIRTABLE_API_KEY === '' && !window.airtableWarning) {
    window.airtableWarning = true;
    alert(`Please provide your Airtable API key.`);
    return;
  }

  try {
    const response = await queryAirtable({
      query: queryData.query,
      page: queryData.page,
      perPage: queryData.perPage
    });
    const { results } = response;

    return {
      assets: results.map(translateToAssetResult),
      // Airtable does not return a total number of assets.
      // With a high number, we force the button to display 'more'
      total: 99999,
      currentPage: 1,
      nextPage: undefined
    };
  } catch (error) {
    console.error('Error finding Airtable assets:', error);
    return {
      assets: [],
      total: 0,
      currentPage: 1,
      nextPage: undefined
    };
  }
};

function translateToAssetResult({ image }) {
  return {
    id: image.id,
    type: 'ly.img.image',
    locale: 'en',
    label: image.name ?? undefined,

    thumbUri: image.thumbnails.large.url,

    size: {
      width: image.width,
      height: image.height
    },

    meta: {
      uri: image.url
    },

    context: {
      sourceId: 'airtable'
    }
  };
}
