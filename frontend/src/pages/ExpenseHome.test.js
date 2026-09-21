import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ExpensesHome from "./ExpenseHome";
import * as apiClient from "../api/client";

jest.mock("../api/client", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
}));

describe("ExpensesHome month filters", () => {
  beforeEach(() => {
    apiClient.apiGet.mockImplementation((path) => {
      if (path.startsWith("/groups")) return Promise.resolve([]);
      if (path.startsWith("/expenses")) {
        return Promise.resolve({
          data: [],
          pagination: { has_more: false },
        });
      }
      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("activates bulk split mode on long-press and allows a master share action", async () => {
    jest.useFakeTimers();

    apiClient.apiGet.mockImplementation((path) => {
      if (path.startsWith("/groups")) return Promise.resolve([]);
      if (path.startsWith("/expenses")) {
        return Promise.resolve({
          data: [
            { id: "exp-1", description: "Groceries", amount: 30.5, date: "2026-09-04", group_id: null, status: "pending" },
            { id: "exp-2", description: "Transport", amount: 12, date: "2026-09-05", group_id: null, status: "pending" },
          ],
          pagination: { has_more: false },
        });
      }
      return Promise.resolve([]);
    });

    render(
      <ExpensesHome
        setPage={jest.fn()}
        currentUser={{ id: "user-1" }}
        setEditExpenseData={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText("Groceries"));
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Select all")).toBeInTheDocument();
    expect(screen.getByText("Share Selected")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Select Groceries"));
    fireEvent.click(screen.getByRole("button", { name: "Share Selected" }));

    await waitFor(() => {
      expect(screen.getByText("Share Selected Expenses")).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it("shows the last 6 months as quick filters and fetches the selected month", async () => {
    render(
      <ExpensesHome
        setPage={jest.fn()}
        currentUser={{ id: "user-1" }}
        setEditExpenseData={jest.fn()}
      />
    );

    const monthList = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - index);
      return date.toLocaleString("en-US", { month: "short", year: "numeric" });
    });

    for (const label of monthList) {
      expect(screen.getByRole("button", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }

    const selectedMonth = monthList[0];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(selectedMonth, "i") }));

    await waitFor(() => {
      const lastCall = apiClient.apiGet.mock.calls.at(-1);
      expect(lastCall?.[0]).toContain("month=");
    });
  });
});
