const chrono = require("chrono-node");
const customChronoParser = chrono.casual.clone();

const rollOverYearRefiner = {
  refine: (_, results) => {
    results.forEach(({ start, refDate }) => {
      if (
        start.isCertain("month") &&
        !start.isCertain("year") &&
        start.date().getTime() < refDate.getTime()
      ) {
        start.imply("year", start.get("year") + 1);
      }
    });
    return results;
  },
};

const rollOverDayRefiner = {
  refine: (_, results) => {
    results.forEach(({ start, refDate }) => {
      if (
        start.isCertain("hour") &&
        !start.isCertain("day") &&
        start.date().getTime() < refDate.getTime()
      ) {
        start.imply("day", start.get("day") + 1);
      }
    });
    return results;
  },
};

// Examples: "Tuesday, 9th of July 2019. 19:00 GMT" and "tomorrow by 9pm"
// Both produce two results each: one with the date and one with the time
const combineDateAndTime = {
  refine: (_, results) => {
    if (results.length < 2) {
      // Our current data suggests this scenario only yields two results
      return results;
    }
    const resultWithDate = results.find(({ start }) => {
      return start.isCertain("day") || start.isCertain("weekday");
    });
    const resultWithTime = results.find(({ start }) => {
      return start.isCertain("hour");
    });
    if (resultWithDate == undefined || resultWithTime == undefined) {
      // Faulty thesis; bail.
      return results;
    }

    resultWithDate.start.imply("hour", resultWithTime.start.get("hour"));
    resultWithDate.start.imply("minute", resultWithTime.start.get("minute"));
    resultWithDate.start.imply(
      "meridiem",
      resultWithTime.start.get("meridiem")
    );
    resultWithDate.start.imply(
      "timezoneOffset",
      resultWithTime.start.get("timezoneOffset")
    );

    resultWithTime.start.imply("weekday", resultWithDate.start.get("weekday"));
    resultWithTime.start.imply("day", resultWithDate.start.get("day"));
    resultWithTime.start.imply("month", resultWithDate.start.get("month"));
    resultWithTime.start.imply("year", resultWithDate.start.get("year"));

    return results;
  },
};

const hrsMinsParser = {
  pattern: () => /(\d+)\s*hrs?(\s+(\d+)\s*min(s|ute|utes)?)?/i, // Match a pattern like "in 22hrs (30 mins)"
  extract: ({ refDate }, match) => {
    let dateMoment = require("moment")(refDate);
    dateMoment = dateMoment.add(match[1], "hours");
    dateMoment = dateMoment.add(match[3], "minutes");
    return {
      refDate,
      text: match[0],
      index: match.index,
      start: {
        hour: dateMoment.hour(),
        minute: dateMoment.minute(),
        second: dateMoment.second(),
        day: dateMoment.date(),
        month: dateMoment.month() + 1,
        year: dateMoment.year(),
      },
    };
  },
};

customChronoParser.parsers.push(hrsMinsParser);
customChronoParser.refiners.push(rollOverYearRefiner);
customChronoParser.refiners.push(rollOverDayRefiner);
customChronoParser.refiners.push(combineDateAndTime);

console.log("question results ------------");
console.log(
  "PARSE--------- ",
  JSON.stringify(
    customChronoParser.parse(
      "in 22hrs (30 mins) JST",
      new Date("Fri Apr 30 07:30:06 +0000 2021"),
      {
        forwardDate: true,
        // timezones: "JST",
      }
    ),
    null,
    2
  )
);
console.log(
  "PARSEDATE--------- ",
  JSON.stringify(
    customChronoParser.parseDate(
      "in 22hrs (30 mins) JST",
      new Date("Fri Apr 30 07:30:06 +0000 2021"),
      {
        forwardDate: true,
        // timezones: "JST",
      }
    )
  )
);
// const parseResults = customChronoParser.parse(
//   "in 22hrs (30 mins) JST",
//   new Date("Fri Apr 30 07:30:06 +0000 2021"),
//   {
//     forwardDate: true,
//     // timezones: "JST",
//   }
// );
// console.log(JSON.stringify(parseResults[parseResults.length - 1].text));

// created_at": "Fri Apr 30 07:30:06 +0000 2021"
