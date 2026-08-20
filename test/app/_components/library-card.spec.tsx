/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { LibraryCard } from "@/app/_components/library-card";

describe("LibraryCard", () => {
  it("renders the stamp label, title and subtitle", () => {
    // given / when
    render(
      <LibraryCard
        stampLabel="Request"
        tone="default"
        title="Solaris"
        subtitle="Ola Zielińska wants to borrow this book"
      />
    );

    // then
    expect(screen.getByText("Request")).toBeInTheDocument();
    expect(screen.getByText("Solaris")).toBeInTheDocument();
    expect(
      screen.getByText("Ola Zielińska wants to borrow this book")
    ).toBeInTheDocument();
  });

  it.each([["default" as const], ["pending-return" as const]])(
    "renders distinct stamp styling for the %s tone",
    (tone) => {
      // given / when
      render(
        <LibraryCard
          stampLabel="Return"
          tone={tone}
          title="Pan Tadeusz"
          subtitle="With Marek Wiśniewski"
        />
      );

      // then
      const stampText = screen.getByText("Return");
      expect(stampText).toHaveStyle({ transform: "rotate(180deg)" });
    }
  );

  it("renders the meta line when metaLabel is present", () => {
    // given / when
    render(
      <LibraryCard
        stampLabel="Request"
        tone="default"
        title="Solaris"
        subtitle="Ola Zielińska wants to borrow this book"
        metaLabel="REPORTED: 2 DAYS AGO"
      />
    );

    // then
    expect(screen.getByText("REPORTED: 2 DAYS AGO")).toBeInTheDocument();
  });

  it("omits the meta line when metaLabel is absent", () => {
    // given / when
    render(
      <LibraryCard
        stampLabel="Request"
        tone="default"
        title="Solaris"
        subtitle="Ola Zielińska wants to borrow this book"
      />
    );

    // then
    expect(screen.queryByText(/REPORTED/)).not.toBeInTheDocument();
  });

  it("renders the pill slot when provided", () => {
    // given / when
    render(
      <LibraryCard
        stampLabel="Request"
        tone="default"
        title="Solaris"
        subtitle="Ola Zielińska wants to borrow this book"
        pill={<span>Pending</span>}
      />
    );

    // then
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("renders the actions slot when provided", () => {
    // given / when
    render(
      <LibraryCard
        stampLabel="Request"
        tone="default"
        title="Solaris"
        subtitle="Ola Zielińska wants to borrow this book"
        actions={<button>Approve</button>}
      />
    );

    // then
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });
});
