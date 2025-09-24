This .zip archive contains Quality Controlled float data for biogeochemical profiling floats deployed by the Southern Ocean Carbon and Climate Observation and Modeling (SOCCOM) and  Global Ocean Biogeochemistry Array (GO-BGC) projects.  Additional University of Washington/MBARI floats deployed outside of these programs have also been included in the archive. Data for all floats within this archive were processed by the float data management team at the Monterey Bay Aquarium Research Institute (MBARI).  A comprehensive listing of floats processed by MBARI (including internal floatID, WMOID, float platform type, and program) is included within each archive.  Note that historical snapshots, frozen prior to December 2022, can be found under the SOCCOM collection (https://doi.org/10.6075/J0TX3C9X).

FORMAT:
The ascii files contained herein were formatted to be compatible with Ocean Data View (ODV). Character encoding is UTF-8. ODV is freely available at https://odv.awi.de/.  In addition, a Matlab function has been provided in each .zip archive for parsing the .txt files into data structures within Matlab (see get_FloatViz_data.m).  Please note that the data files within this .zip archive represent a snapshot of all SOCCOM and GO-BGC float data processed at MBARI as of the date listed in the file name.  Therefore, be aware that processing updates (** AND THUS CHANGES TO THE DATA **) may have occurred since the time the snapshot was created.  For the most up-to-date files (processed every 4 hours), visit https://ftp.mbari.org/pub/SOCCOM/FloatVizData/ or https://www.mbari.org/science/upper-ocean-systems/chemical-sensor-group/floatviz/

ALTERNATE FORMATS: NetCDF and Matlab
Matlab and NetCDF formatted files are provided for each ODV text file.  The Matlab format is loaded as structure, FloatViz, with the ODV parameter names as the structure's fieldnames.  The NetCDF format is similar to ARGO Float NetCDF format in its structure.  The parameter names and flagging, however, match the ODV text parameter names.  In addition to the quality control flag string entries, a numeric array of quality control flags is provided in the NetCDF files for programming convenience. Additionally, note that an explanation of Quality Flag Identifiers is included in each alternate format file.

QUALITY CONTROL DOCUMENTATION:
Delayed-mode quality control (DMQC) of biogeochemical float data within this archive is performed routinely by data managers at MBARI following Maurer et al (2021), https://doi.org/10.3389/fmars.2021.683207.  QC notification emails are currently being sent out periodically to inform users of key updates to processing, QC and/or sensor calibrations for specific floats.  All QC emails as of the date of this snapshot are included in each downloadable zip file.

PARAMETERS:
For information pertaining to float identification, sensor arrays, data parameters, and quality control please refer to descriptions within the file headers.  Each snapshot within this collection includes estimated total alkalinity and derived carbon parameters for DIC and pCO2 using one of two algorithms (LIAR or CANYONB).  Floats without a pH sensor will not have these additional parameters within their respective data files.  See file headers for details.  Additionally, files located at the urls listed above will include carbon parameters derived using observed pH and total alkalinity estimated by the LIAR method. All carbonate system variables calculated with CO2SYS for Matlab (Sharp et al., 2020; see also Lewis and Wallace 1998) used the following conditions: pH was reported on the total scale.  K1 and K2 dissociation constants were from Lueker et al., 2000, doi:10.1016/S0304-4203(00)00022-0. The KSO4 dissociation constant was from Dickson, 1990, doi: 10.1016/0021-9614(90)90074-Z. The KF dissociation constant was from Perez and Fraga 1987, doi: 10.1016/0304-4203(87)90036-3. The borate to salinity ratio was from Lee et al., 2010, doi:10.1016/j.gca.2009.12.027. Silicate and Phosphate were not measured by the float, but estimates based on Redfieldian ratios improved the carbonate system estimates. If a nitrate value was considered to be of good quality silicate = nitrate*2.5 and phosphate = nitrate/16, otherwise the best estimate for both was considered to be 0. When pCO2 was estimated from TALK_LIAR and pHinsitu, a bias was first added to pH (25C,0dbar) following Williams et al., 2017, doi: https:doi.org/10.1002/2016GB005541 , section 3.4, equation 3.   This correction is not necessary for DIC and DIC is computed with the reported pH and the TALK_LIAR value.

RESOLUTION:
This archive contains both low resolution and high resolution data.  The format is defined by the folder name: SOCCOM_GO-BGC_LoResQC_METHOD_ddmmmyyyy or SOCCOM_GO-BGC_HiResQC_METHOD_ddmmmyyyy (where METHOD = LIAR or CANYONB).  Note that for APEX floats, the low resolution files only report data at depths where biogeochemical sensors sample, while the high resolution files merge this low resolution data with higher resolution pressure, temperature and salinity data (sampled every two meters in the upper 1000 meters).  Be aware that, due to the merging of the two separate sampling schemes by interleaving the LowRes samples into the HiRes sample structure, HiRes files could potentially contain separate sets of samples with duplicate pressure values. For Navis floats all biogeochemical sensors except nitrate are sampled every 2 meters in the upper 1000 m.  Additionally, all Navis float data is contained in both the LoRes and HiRes archives (per user request).

DISCLAIMER:
These data are provided as-is.  We do our best to provide high-quality, complete data but make no guarantees as to the presence of errors within the data themselves or the algorithms used in the generation of derived parameters.  It is the user's responsibility to ensure that the data meets the user's needs.  However, please report any observed discrepancies in the data to the contact listed below and we will do our best to fix them. 

RELATED RESOURCES (REFERENCE):

Bittig, H. C., Steinhoff,T., Claustre, H., Fiedler, B., Williams, N. L., Sauzède, R., Körtzinger, A. & Gattuso, J-P. (2018). An Alternative to Static Climatologies: Robust Estimation of Open Ocean CO2 Variables and Nutrient Concentrations From T, S, and O2 Data Using Bayesian Neural Networks. Front. Mar. Sci., 5:328. https://doi.org/10.3389/fmars.2018.00328

Carter, B. R., Williams, N. L., Gray, A. R. & Feely, R. A. (2016). Locally interpolated alkalinity regression for global alkalinity estimation. Limnol. Oceanogr. Methods, 14:268-277. https://doi.org/10.1002/lom3.10087

Carter, B. R., Feely, R. A., Williams, N. L., Dickson, A. G., Fong, M. B. & Takeshita, Y. (2018). Updated methods for global locally interpolated estimation of alkalinity, pH, and nitrate. Limnol. Oceanogr. Methods, 16:119-131. https://doi.org/10.1002/lom3.10232

Dickson, A. G. (1990). Standard potential of the reaction: AgCl(s) + 12H2(g) = Ag(s) + HCl(aq), and and the standard acidity constant of the ion HSO4− in synthetic sea water from 273.15 to 318.15 K. The Journal of Chemical Thermodynamics 22(2):113-127. https://doi.org/10.1016/0021-9614(90)90074-Z

Perez, F. F. & Fraga, F. (1987). Association constant of fluoride and hydrogen ions in seawater. Marine Chemistry 21(2):161-168. https://doi.org/10.1016/0304-4203(87)90036-3

Lee, K., Kim, T-W., Byrne, R. H., Millero, F. J., Feely, R. A. & Liu, Y-M. (2010). The universal ratio of boron to chlorinity for the North Pacific and North Atlantic oceans. Geochimica et Cosmochimica Acta 74(6):1801-1811. https://doi.org/10.1016/j.gca.2009.12.027

Lewis, E. & Wallace, D. (1998, February). Program Developed for CO2 System Calculations (ORNL/CDIAC-105, Environmental Sciences Division Publication No. 4735). Carbon Dioxide Information Analysis Center, Oak Ridge National Laboratory. Retrieved from https://www.ncei.noaa.gov/access/ocean-carbon-data-system/oceans/CO2SYS/cdiac105.pdf

Maurer, T. L., Plant, J. N. & Johnson, K. S. (2021). Delayed-Mode Quality Control of Oxygen, Nitrate, and pH Data on SOCCOM Biogeochemical Profiling Floats. Front. Mar. Sci. 8:683207. https://doi.org/10.3389/fmars.2021.683207

Sauzède, R., Bittig, H. C., Claustre, H., Pasqueron de Fommervault, O., Gattuso, J-P., Legendre, L. & Johnson K. S. (2017). Estimates of Water-Column Nutrient Concentrations and Carbonate System Parameters in the Global Ocean: A Novel Approach Based on Neural Networks. Front. Mar. Sci. 4:128. https://doi.org/10.3389/fmars.2017.00128

Sharp, J. D., Pierrot, D., Humphreys, M. P., Epitalon, J-M., Orr, J. C., Lewis, E. R. & Wallace, D. W. R. (2020). CO2SYSv3 for MATLAB (v3.0.1). Zenodo. https://doi.org/10.5281/zenodo.3952803

Lueker, T. J., Dickson, A. G., & Keeling, C. D. (2000). Ocean pCO2 calculated from dissolved inorganic carbon, alkalinity, and equations for K1 and K2: validation based on laboratory measurements of CO2 in gas and seawater at equilibrium. Marine Chemistry 70(1–3):105-119. https://doi.org/10.1016/S0304-4203(00)00022-0

Williams, N. L., et al. (2017). Calculating surface ocean pCO2 from biogeochemical Argo floats equipped with pH: An uncertainty analysis, Global Biogeochem. Cycles, 31, 591– 604. https://doi.org/10.1002/2016GB005541 

RELATED RESOURCE (PRIMARY ASSOCIATED PUBLICATION):
SOCCOM Publications list: https://soccom.princeton.edu/content/soccom-publications
GO-BGC Publications list: https://www.go-bgc.org/resources/publications

RELATED RESOURCE (DESCRIBED BY):
SOCCOM website: https://soccom.princeton.edu/
GO-BGC website: https://www.go-bgc.org/
Float Quality Control Methods: https://doi.org/10.3389/fmars.2021.683207

ACKNOWLEDGEMENTS: 
Authors using this data should acknowledge that "Data were collected and made freely available by the Southern Ocean Carbon and Climate Observations and Modeling (SOCCOM) Project funded by the National Science Foundation, Division of Polar Programs (NSF PLR-1425989, with extension NSF OPP-1936222), and by the Global Ocean Biogeochemistry Array (GO-BGC) Project funded by the National Science Foundation, Division of Ocean Sciences (NSF OCE-1946578), supplemented by NASA, and by the International Argo Program and the NOAA programs that contribute to it. The Argo Program is part of the Global Ocean Observing System (https://doi.org/10.17882/42182, https://www.ocean-ops.org/board?t=argo)".  In addition, users should reference the appropriate DOI, as listed on each snapshot page under Cite This Work.

CONTACT:
Please report any discrepancies, problems or concerns to the following and include "FLOATVIZ SNAPSHOT PROCESSING" in the subject line of the email.
Tanya Maurer tmaurer@mbari.org
Josh Plant jplant@mbari.org
SOCCOM/GO-BGC Data Management
MBARI
7700 Sandholdt Road
Moss Landing, CA 95039
