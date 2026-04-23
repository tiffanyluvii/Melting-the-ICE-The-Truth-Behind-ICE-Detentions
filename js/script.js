import { showWords, runImagesAndAudio } from "./section1.js"
import { runSection2 } from "./section2.js"

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

