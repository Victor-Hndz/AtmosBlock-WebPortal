import os

file1 = './data/Geopotential_selected_max.csv'
file2 = './data/Geopotential_selected_min.csv'

#from the files, take the common part in the name and eliminate the different part
common = os.path.commonprefix([file1, file2])
common = common[:common.rfind('_')+1]
common = common + 'comb.csv'

#combine the files
with open(file1, 'r') as f1, open(file2, 'r') as f2, open(common, 'w') as f3:
    #delete the first line of the second file
    f2.readline()
    for line in f1:
        f3.write(line)
    for line in f2:
        f3.write(line)
        
print('Files combined')
