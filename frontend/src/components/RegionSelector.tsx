import { useState } from "react";

type RegionSelectorProps = {
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
};

type FormData = {
  variables: string[];
  years: string[];
  months: string[];
  days: string[];
  hours: string[];
  area: string;
  types: string[];
  ranges: string[];
  levels: string[];
  format: string;
  out: string;
  tracking: boolean;
  debug: boolean;
  no_compile: boolean;
  no_execute: boolean;
  no_maps: boolean;
  animation: boolean;
  omp: boolean;
  mpi: boolean;
  n_threads: number;
  n_proces: number;
};

const RegionSelector: React.FC<RegionSelectorProps> = ({ setFormData }) => {
  const [isWholeRegion, setIsWholeRegion] = useState(true);
  const [isSubRegion, setIsSubRegion] = useState(false);
  const [north, setNorth] = useState(90);
  const [south, setSouth] = useState(-90);
  const [west, setWest] = useState(-180);
  const [east, setEast] = useState(180);

  const handleWholeRegionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let areaValue = "";
    //check the checkbox of the clicked region and uncheck the other
    if (event.target.id === "wholeRegion") {
      setIsWholeRegion(true);
      setIsSubRegion(false);
      areaValue = "all";
    } else {
      setIsWholeRegion(false);
      setIsSubRegion(true);
      areaValue = [north, west, south, east].join(",");
    }

    setFormData(prev => ({
      ...prev,
      area: areaValue,
    }));
  };

  const handleSubRegionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === "north") setNorth(Number(value));
    if (name === "west") setWest(Number(value));
    if (name === "south") setSouth(Number(value));
    if (name === "east") setEast(Number(value));

    //set NWSE values
    console.log("north", north);
    console.log("west", west);
    console.log("south", south);
    console.log("east", east);
    setFormData(prev => ({
      ...prev,
      area: [north, west, south, east].join(","),
    }));
  };

  return (
    <div>
      <div>
        <label>
          Whole region:{" "}
          <input id="wholeRegion" type="checkbox" checked={isWholeRegion} onChange={handleWholeRegionChange} />
        </label>
      </div>
      <div>
        <label>
          Sub-region: <input id="subRegion" type="checkbox" checked={isSubRegion} onChange={handleWholeRegionChange} />
        </label>
      </div>
      <div>
        <label>
          Norte:{" "}
          <input type="number" name="north" value={north} onChange={handleSubRegionChange} disabled={isWholeRegion} />
        </label>
        <label>
          Sur:{" "}
          <input type="number" name="south" value={south} onChange={handleSubRegionChange} disabled={isWholeRegion} />
        </label>
        <label>
          Oeste:{" "}
          <input type="number" name="west" value={west} onChange={handleSubRegionChange} disabled={isWholeRegion} />
        </label>
        <label>
          Este:{" "}
          <input type="number" name="east" value={east} onChange={handleSubRegionChange} disabled={isWholeRegion} />
        </label>
      </div>
    </div>
  );
};

export default RegionSelector;
