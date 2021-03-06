import React, { useMemo } from 'react';
import Select from 'react-windowed-select';

export default ({ stops, isMulti, onChange }) => {
  const options = useMemo(() => getOptions(stops), [stops]);

  return (
    <Select
      isMulti={isMulti}
      placeholder="Velg stopp"
      onChange={onChange}
      options={options}
    />
  );
};

const getOptions = stops => {
  return stops
    .filter(
      (item, i, list) =>
        i ===
        list.findIndex(
          j =>
            j.stopPlace &&
            item.stopPlace &&
            j.stopPlace.id === item.stopPlace.id
        )
    )
    .sort((a, b) => {
      if (a.name > b.name) return 1;
      if (b.name > a.name) return -1;
      return 0;
    })
    .map(item => ({
      label: item.name + ' - ' + item.stopPlace.id,
      value: item.stopPlace.id
    }));
};
