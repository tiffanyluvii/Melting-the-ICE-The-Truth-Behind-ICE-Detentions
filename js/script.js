import { showWords, runImagesAndAudio } from "./section1.js"
import { runSection2 } from "./section2.js"
import { runSection3 } from "./section3.js"
import { runSection4 } from "./section4.js"
import { runSection5 } from "./section5.js"
import { runSection7 } from "./section7.js"

// Load the CSVs and other important attributes
const parseDate = d3.timeParse("%Y-%m-%d")
const biden_data = await d3.csv("./data/detention-stays_filtered_biden_cleaned.csv", d => ({
  ...d,
  date: parseDate(d.date)
}))

const trump_data = await d3.csv("./data/detention-stays_filtered_trump_cleaned.csv", d => ({
  ...d,
  date: parseDate(d.date)
}))
const world_geojson = await d3.json("./data/world-countries.json")

const root = document.documentElement
const styles = getComputedStyle(root)
const main_red = styles.getPropertyValue('--main-red')
const main_blue = styles.getPropertyValue('--main-blue')
console.log("main_blue:", main_blue);

// Section 1: Overview
showWords()
runImagesAndAudio()


// Section 2: Scale of Detention Between Presidency
runSection2(biden_data, trump_data, main_red, main_blue)

// Section 3: Origin, Citizenship, and Departure Pathways
runSection3(trump_data, world_geojson)


// Section 4: ICE Apprension Methods Change Over Time
runSection4()
// Section 5: Case Outcomes
const all_data = [...biden_data, ...trump_data];
runSection5(all_data)

// Section 7: Security Risk Labels
runSection7(all_data)
