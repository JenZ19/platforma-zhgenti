import { render, screen, cleanup } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { CurriculumNotice } from "./CurriculumNotice";
import { progressKey } from "../lib/progress";

beforeEach(()=>{cleanup();localStorage.clear();});
it("explains partial old progress without losing the stored source",()=>{
  const raw=JSON.stringify({version:1,completed:[1,2,3,4,5,6,7],activeStep:8,score:70});
  localStorage.setItem(progressKey("family-expenses"),raw);
  render(<CurriculumNotice slug="family-expenses" total={8}/>);
  expect(screen.getByRole("note")).toHaveTextContent("прежние отметки сохранены");
  expect(localStorage.getItem(progressKey("family-expenses"))).toBe(raw);
});
it("does not add a migration warning to a new learner",()=>{
  render(<CurriculumNotice slug="family-expenses" total={8}/>);
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});
