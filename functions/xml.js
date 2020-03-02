const functions = require('firebase-functions');
const convert = require('xml-js');

exports.xml = function(admin) {
  return functions.https.onRequest((request, response) => {
    if (request.method !== 'POST') {
      const xmlString =
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>This endpoint only handles POST requests</Body></Message></Response>';
      response
        .set('Content-Type', 'text/xml; charset=utf8')
        .status(200)
        .send(xmlString);
    }

    const dateTime = new Date().toISOString();

    console.info('XML request received - dateTime=' + dateTime);

    const db = admin.firestore();

    const siri = {
      Siri: {
        _attributes: {
          version: '2.0',
          xmlns: 'http://www.siri.org.uk/siri',
          'xmlns:ns2': 'http://www.ifopt.org.uk/acsb',
          'xmlns:ns3': 'http://www.ifopt.org.uk/ifopt',
          'xmlns:ns4': 'http://datex2.eu/schema/2_0RC1/2_0'
        }
      }
    };

    const array = {
      ResponseTimestamp: dateTime,
      ProducerRef: 'ENT',
      SituationExchangeDelivery: {
        ResponseTimestamp: dateTime,
        Situations: []
      }
    };

    const open = db
      .collectionGroup('messages')
      .where('Progress', '==', 'open')
      .get();

    const closed = db
      .collectionGroup('messages')
      .where('Progress', '==', 'closed')
      .where('ValidityPeriod.EndTime', '>', dateTime)
      .get();

    Promise.all([open, closed]).then(([openSnapshot, closedSnapshot]) => {
      const allDocs = openSnapshot.docs.concat(closedSnapshot.docs);
      const situations = { PtSituationElement: [] };

      allDocs.forEach(doc => {
        const swapPlaces = doc.data();
        const tmp = {};
        tmp['CreationTime'] = swapPlaces.CreationTime;
        tmp['ParticipantRef'] = swapPlaces.ParticipantRef;
        tmp['SituationNumber'] = swapPlaces.SituationNumber;
        tmp['Source'] = swapPlaces.Source;
        tmp['Progress'] = swapPlaces.Progress;
        tmp['ValidityPeriod'] = swapPlaces.ValidityPeriod;
        tmp['UndefinedReason'] = {};
        tmp['Severity'] = swapPlaces.Severity;
        tmp['ReportType'] = swapPlaces.ReportType;
        tmp['Summary'] = swapPlaces.Summary;
        if (swapPlaces.Description) {
          tmp['Description'] = swapPlaces.Description;
        }
        if (swapPlaces.Advice) {
          tmp['Advice'] = swapPlaces.Advice;
        }
        tmp['Affects'] = swapPlaces.Affects;
        situations.PtSituationElement.push(tmp);
      });

      array.SituationExchangeDelivery.Situations.push(situations);
      siri.Siri.ServiceDelivery = array;

      const result = convert.js2xml(siri, { compact: true, spaces: 4 });

      console.log(
        'Returning number of situations: ' +
          situations.PtSituationElement.length
      );

      response
        .set('Content-Type', 'text/xml')
        .status(200)
        .send(result);
    });
  });
};
